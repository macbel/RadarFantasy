package com.fantasymarketscout.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private File pendingApk;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url", "");
        String version = call.getString("version", "latest").replaceAll("[^0-9A-Za-z._-]", "");
        if (!url.startsWith("https://")) {
            call.reject("La URL de actualización no es segura.");
            return;
        }

        File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (directory == null) {
            call.reject("Android no ha podido preparar la carpeta de descarga.");
            return;
        }
        File apk = new File(directory, "Radar-Fantasy-" + version + ".apk");
        if (apk.exists() && !apk.delete()) {
            call.reject("No se pudo reemplazar una descarga anterior.");
            return;
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle("Radar Fantasy " + version);
        request.setDescription("Descargando actualización");
        request.setMimeType("application/vnd.android.package-archive");
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(false);
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setDestinationUri(Uri.fromFile(apk));

        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        long downloadId;
        try {
            downloadId = manager.enqueue(request);
        } catch (Exception error) {
            call.reject("Android no pudo iniciar la descarga: " + error.getMessage());
            return;
        }

        executor.execute(() -> monitorDownload(call, manager, downloadId, apk));
    }

    private void monitorDownload(PluginCall call, DownloadManager manager, long downloadId, File apk) {
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        int lastProgress = -1;
        while (true) {
            try (Cursor cursor = manager.query(query)) {
                if (cursor == null || !cursor.moveToFirst()) {
                    call.reject("Android ha perdido la referencia de la descarga.");
                    return;
                }
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                int progress = total > 0 ? (int) Math.min(100, downloaded * 100 / total) : 0;
                if (progress != lastProgress) {
                    lastProgress = progress;
                    JSObject data = new JSObject();
                    data.put("progress", progress);
                    data.put("downloaded", downloaded);
                    data.put("total", total);
                    getActivity().runOnUiThread(() -> notifyListeners("appUpdateProgress", data));
                }
                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    pendingApk = apk;
                    getActivity().runOnUiThread(() -> requestInstall(call));
                    return;
                }
                if (status == DownloadManager.STATUS_FAILED) {
                    int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                    call.reject("La descarga ha fallado (código " + reason + ").");
                    return;
                }
            } catch (Exception error) {
                call.reject("No se pudo completar la descarga: " + error.getMessage());
                return;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                call.reject("La descarga se ha interrumpido.");
                return;
            }
        }
    }

    private void requestInstall(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            startActivityForResult(call, settings, "installPermissionResult");
            return;
        }
        openInstaller(call);
    }

    @ActivityCallback
    private void installPermissionResult(PluginCall call, ActivityResult result) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("Debes permitir la instalación de aplicaciones para completar la actualización.");
            return;
        }
        openInstaller(call);
    }

    private void openInstaller(PluginCall call) {
        if (pendingApk == null || !pendingApk.exists()) {
            call.reject("El APK descargado no está disponible.");
            return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", pendingApk);
        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(uri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(install);
        JSObject result = new JSObject();
        result.put("downloaded", true);
        result.put("installerOpened", true);
        call.resolve(result);
    }
}
