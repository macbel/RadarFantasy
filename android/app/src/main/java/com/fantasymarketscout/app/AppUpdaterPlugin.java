package com.fantasymarketscout.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final long MAX_DOWNLOAD_MS = 15 * 60 * 1000L;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private File pendingApk;
    private DownloadManager pendingManager;
    private long pendingDownloadId = -1;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        if (!busy.compareAndSet(false, true)) {
            call.reject("Ya hay una actualización en curso.", "BUSY");
            return;
        }
        String url = call.getString("url", "");
        String version = call.getString("version", "latest").replaceAll("[^0-9A-Za-z._-]", "");
        if (!url.matches("(?i)^https://[^\\s]+\\.apk(?:\\?.*)?$")) {
            fail(call, "La URL del APK no es segura o válida.", "INVALID_URL");
            return;
        }
        File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (directory == null) {
            fail(call, "Android no ha podido preparar la carpeta de descarga.", "STORAGE_ERROR");
            return;
        }
        File apk = new File(directory, "Radar-Fantasy-" + version + ".apk");
        if (apk.exists() && !apk.delete()) {
            fail(call, "No se pudo reemplazar una descarga anterior.", "STORAGE_ERROR");
            return;
        }
        try {
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException("Gestor de descargas no disponible");
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Radar Fantasy " + version);
            request.setDescription("Descargando actualización");
            request.setMimeType("application/vnd.android.package-archive");
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(false);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            request.setDestinationUri(Uri.fromFile(apk));
            pendingApk = apk;
            pendingManager = manager;
            pendingDownloadId = manager.enqueue(request);
            long downloadId = pendingDownloadId;
            emitStage("downloading", 0, 0, 0);
            executor.execute(() -> monitorDownload(call, manager, downloadId, apk));
        } catch (Exception error) {
            fail(call, "Android no pudo iniciar la descarga: " + error.getMessage(), "DOWNLOAD_START_FAILED");
        }
    }

    private void emitStage(String stage, int progress, long downloaded, long total) {
        JSObject data = new JSObject();
        data.put("stage", stage);
        data.put("progress", progress);
        data.put("downloaded", downloaded);
        data.put("total", total);
        getActivity().runOnUiThread(() -> notifyListeners("appUpdateProgress", data));
    }

    private void monitorDownload(PluginCall call, DownloadManager manager, long downloadId, File apk) {
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        long started = System.currentTimeMillis();
        int lastProgress = -1;
        while (busy.get()) {
            if (System.currentTimeMillis() - started > MAX_DOWNLOAD_MS) {
                fail(call, "La descarga tardó demasiado. Revisa la conexión e inténtalo de nuevo.", "DOWNLOAD_TIMEOUT");
                return;
            }
            try (Cursor cursor = manager.query(query)) {
                if (cursor == null || !cursor.moveToFirst()) {
                    fail(call, "Android ha perdido la referencia de la descarga.", "DOWNLOAD_MISSING");
                    return;
                }
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                int progress = total > 0 ? (int) Math.min(100, downloaded * 100 / total) : 0;
                if (progress != lastProgress) {
                    lastProgress = progress;
                    emitStage("downloading", progress, downloaded, total);
                }
                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    emitStage("verifying", 100, downloaded, total);
                    try {
                        verifyApk(call, apk);
                    } catch (Exception error) {
                        fail(call, "El APK no superó la verificación: " + error.getMessage(), "APK_VERIFICATION_FAILED");
                        return;
                    }
                    getActivity().runOnUiThread(() -> requestInstall(call));
                    return;
                }
                if (status == DownloadManager.STATUS_FAILED) {
                    int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                    fail(call, "La descarga ha fallado (código " + reason + ").", "DOWNLOAD_FAILED");
                    return;
                }
            } catch (Exception error) {
                fail(call, "No se pudo completar la descarga: " + error.getMessage(), "DOWNLOAD_ERROR");
                return;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                fail(call, "La descarga se ha interrumpido.", "DOWNLOAD_INTERRUPTED");
                return;
            }
        }
    }

    private void verifyApk(PluginCall call, File apk) throws Exception {
        if (!apk.isFile() || apk.length() <= 0) throw new IllegalArgumentException("archivo vacío o ausente");
        long expectedSize = call.getData().optLong("expectedSize", 0);
        if (expectedSize > 0 && apk.length() != expectedSize) throw new IllegalArgumentException("tamaño distinto del publicado");
        String expectedSha256 = call.getString("expectedSha256", "");
        if (!expectedSha256.isEmpty() && !sha256(apk).equalsIgnoreCase(expectedSha256)) throw new IllegalArgumentException("SHA-256 distinto del publicado");
        PackageManager pm = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo archive = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        if (archive == null) throw new IllegalArgumentException("archivo no reconocido como APK válido");
        String expectedPackage = call.getString("packageName", getContext().getPackageName());
        if (!getContext().getPackageName().equals(expectedPackage) || !expectedPackage.equals(archive.packageName)) throw new IllegalArgumentException("paquete de otra aplicación");
        PackageInfo installed = pm.getPackageInfo(getContext().getPackageName(), flags);
        long archiveCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? archive.getLongVersionCode() : archive.versionCode;
        long installedCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? installed.getLongVersionCode() : installed.versionCode;
        long expectedCode = call.getData().optLong("versionCode", 0);
        if (archiveCode <= installedCode) throw new IllegalArgumentException("versión igual o anterior a la instalada");
        if (expectedCode > 0 && archiveCode != expectedCode) throw new IllegalArgumentException("código de versión distinto del publicado");
        String expectedVersion = call.getString("version", "");
        if (!expectedVersion.isEmpty() && !expectedVersion.equals(archive.versionName)) throw new IllegalArgumentException("nombre de versión distinto del publicado");
        Signature[] signers = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && archive.signingInfo != null
            ? archive.signingInfo.getApkContentsSigners() : archive.signatures;
        if (signers == null || signers.length == 0) throw new IllegalArgumentException("APK sin certificado verificable");
        boolean compatible = true;
        for (Signature signer : signers) {
            boolean signerCompatible = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                byte[] digest = MessageDigest.getInstance("SHA-256").digest(signer.toByteArray());
                signerCompatible = pm.hasSigningCertificate(getContext().getPackageName(), digest, PackageManager.CERT_INPUT_SHA256);
            } else if (installed.signatures != null) {
                for (Signature current : installed.signatures) if (current.equals(signer)) signerCompatible = true;
            }
            if (!signerCompatible) compatible = false;
        }
        if (!compatible) throw new IllegalArgumentException("certificado incompatible con la aplicación instalada");
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder hex = new StringBuilder();
        for (byte value : digest.digest()) hex.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        return hex.toString();
    }

    private void requestInstall(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
                emitStage("permission", 100, 0, 0);
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                startActivityForResult(call, settings, "installPermissionResult");
                return;
            }
            openInstaller(call);
        } catch (Exception error) {
            fail(call, "No se pudo solicitar el permiso de instalación: " + error.getMessage(), "PERMISSION_ERROR");
        }
    }

    @ActivityCallback
    private void installPermissionResult(PluginCall call, ActivityResult result) {
        if (call == null) { cleanup(); return; }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
                fail(call, "No se concedió permiso para instalar aplicaciones desde Radar Fantasy.", "PERMISSION_DENIED");
                return;
            }
            openInstaller(call);
        } catch (Exception error) {
            fail(call, "No se pudo continuar tras conceder el permiso: " + error.getMessage(), "PERMISSION_ERROR");
        }
    }

    private void openInstaller(PluginCall call) {
        try {
            if (pendingApk == null || !pendingApk.isFile()) throw new IllegalStateException("El APK descargado ya no está disponible");
            emitStage("installer", 100, pendingApk.length(), pendingApk.length());
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", pendingApk);
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(uri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(install);
            JSObject result = new JSObject();
            result.put("downloaded", true);
            result.put("installerOpened", true);
            busy.set(false);
            pendingManager = null;
            pendingDownloadId = -1;
            call.resolve(result);
        } catch (Exception error) {
            fail(call, "Android no pudo abrir el instalador: " + error.getMessage(), "INSTALLER_ERROR");
        }
    }

    private void fail(PluginCall call, String message, String code) {
        cleanup();
        getActivity().runOnUiThread(() -> call.reject(message, code));
    }

    private void cleanup() {
        busy.set(false);
        try {
            if (pendingManager != null && pendingDownloadId >= 0) pendingManager.remove(pendingDownloadId);
        } catch (Exception ignored) { }
        if (pendingApk != null && pendingApk.exists()) pendingApk.delete();
        pendingManager = null;
        pendingDownloadId = -1;
        pendingApk = null;
    }
}
