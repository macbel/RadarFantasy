<?php
declare(strict_types=1);

function auth_permissions(): array
{
    return ['team', 'market', 'league', 'favorites', 'teamTracking', 'compare', 'videos', 'settings'];
}

function auth_lower(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function auth_text_limit(string $value, int $length): string
{
    return function_exists('mb_substr') ? mb_substr($value, 0, $length, 'UTF-8') : substr($value, 0, $length);
}

function auth_is_local_request(): bool
{
    $address = strtolower(trim((string)($_SERVER['REMOTE_ADDR'] ?? '')));
    return in_array($address, ['127.0.0.1', '::1', 'localhost'], true);
}

function auth_bootstrap_allowed(): bool
{
    return auth_is_local_request() || env_bool('FMS_ALLOW_ADMIN_BOOTSTRAP', false);
}

function auth_bootstrap_from_environment(string $usersPath): bool
{
    $db = auth_read_db($usersPath);
    if ($db['users']) return false;
    $email = auth_lower(trim((string)getenv('FMS_ADMIN_EMAIL')));
    $password = (string)getenv('FMS_ADMIN_PASSWORD');
    $name = trim((string)getenv('FMS_ADMIN_NAME')) ?: 'Administrador';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 10) return false;
    $id = auth_new_id();
    $now = gmdate('c');
    $db['users'][$id] = [
        'id' => $id, 'name' => auth_text_limit($name, 80), 'email' => $email,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT), 'role' => 'admin',
        'permissions' => auth_permissions(), 'blocked' => false,
        'createdAt' => $now, 'updatedAt' => $now, 'lastLoginAt' => null
    ];
    auth_write_db($usersPath, $db);
    $baseDir = dirname($usersPath);
    $accountDir = $baseDir . DIRECTORY_SEPARATOR . 'accounts' . DIRECTORY_SEPARATOR . $id;
    ensure_directory($accountDir);
    foreach (['leagues.php.json', 'team-tracking.json'] as $legacyName) {
        $legacyPath = $baseDir . DIRECTORY_SEPARATOR . $legacyName;
        $targetPath = $accountDir . DIRECTORY_SEPARATOR . $legacyName;
        if (is_file($legacyPath) && !is_file($targetPath)) @copy($legacyPath, $targetPath);
    }
    return true;
}

function auth_read_db(string $path): array
{
    $db = read_json_file($path, ['version' => 1, 'users' => []]);
    $db['users'] = is_array($db['users'] ?? null) ? $db['users'] : [];
    return $db;
}

function auth_write_db(string $path, array $db): void
{
    write_json_file($path, $db);
}

function auth_public_user(array $user): array
{
    return [
        'id' => (string)($user['id'] ?? ''),
        'name' => (string)($user['name'] ?? ''),
        'email' => (string)($user['email'] ?? ''),
        'role' => ($user['role'] ?? '') === 'admin' ? 'admin' : 'user',
        'permissions' => ($user['role'] ?? '') === 'admin'
            ? auth_permissions()
            : array_values(array_intersect(auth_permissions(), (array)($user['permissions'] ?? []))),
        'blocked' => !empty($user['blocked']),
        'createdAt' => $user['createdAt'] ?? null,
        'updatedAt' => $user['updatedAt'] ?? null,
        'lastLoginAt' => $user['lastLoginAt'] ?? null
    ];
}

function auth_find_user(array $db, string $id): ?array
{
    $user = $db['users'][$id] ?? null;
    return is_array($user) ? $user : null;
}

function auth_find_user_by_email(array $db, string $email): ?array
{
    $needle = auth_lower(trim($email));
    foreach ($db['users'] as $user) {
        if (is_array($user) && auth_lower((string)($user['email'] ?? '')) === $needle) return $user;
    }
    return null;
}

function auth_current_user(array $db): ?array
{
    $id = (string)($_SESSION['radarUserId'] ?? '');
    $user = $id !== '' ? auth_find_user($db, $id) : null;
    if (!$user || !empty($user['blocked'])) {
        unset($_SESSION['radarUserId'], $_SESSION['biwenger'], $_SESSION['futbolFantasy']);
        return null;
    }
    return $user;
}

function auth_new_id(): string
{
    return 'user-' . bin2hex(random_bytes(12));
}

function auth_active_admin_count(array $db, string $excludingId = ''): int
{
    return count(array_filter($db['users'], static function ($user) use ($excludingId) {
        return is_array($user)
            && (string)($user['id'] ?? '') !== $excludingId
            && ($user['role'] ?? '') === 'admin'
            && empty($user['blocked']);
    }));
}

function auth_validate_password(string $password): void
{
    if (strlen($password) < 10) send_json(400, ['error' => 'La contraseña debe tener al menos 10 caracteres']);
}

function auth_reset_url(string $token): string
{
    $base = rtrim((string)getenv('FMS_APP_URL'), '/');
    if ($base === '') {
        $origin = rtrim((string)($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
        $base = $origin !== '' ? $origin : preg_replace('~/api/?$~', '', api_base_url());
    }
    return $base . '/index.html?resetToken=' . rawurlencode($token);
}

function auth_send_reset_email(array $user, string $link): bool
{
    $from = trim((string)getenv('FMS_MAIL_FROM')) ?: 'no-reply@localhost';
    $subject = 'Restablecer contraseña de Radar Fantasy';
    $message = "Hola " . ($user['name'] ?? '') . ",\n\n";
    $message .= "Usa este enlace para crear una contraseña nueva. Caduca en 60 minutos:\n\n" . $link . "\n\n";
    $message .= "Si no pediste este cambio, ignora el mensaje.";
    $headers = "From: Radar Fantasy <{$from}>\r\nContent-Type: text/plain; charset=UTF-8";
    return @mail((string)$user['email'], $subject, $message, $headers);
}

function auth_handle_public_routes(string $route, string $method, string $usersPath, string $resetsPath): void
{
    if (strpos($route, '/auth/') !== 0) return;
    $db = auth_read_db($usersPath);

    if ($route === '/auth/status' && $method === 'GET') {
        $user = auth_current_user($db);
        send_json(200, [
            'authenticated' => $user !== null,
            'bootstrapRequired' => count($db['users']) === 0 && auth_bootstrap_allowed(),
            'administratorConfigured' => count($db['users']) > 0,
            'user' => $user ? auth_public_user($user) : null
        ]);
    }

    if ($route === '/auth/bootstrap' && $method === 'POST') {
        if (!auth_bootstrap_allowed()) send_json(403, ['error' => 'La cuenta administradora solo puede crearse desde el servidor']);
        if ($db['users']) send_json(409, ['error' => 'La cuenta administradora inicial ya existe']);
        $payload = read_json_body();
        $name = trim((string)($payload['name'] ?? ''));
        $email = auth_lower(trim((string)($payload['email'] ?? '')));
        $password = (string)($payload['password'] ?? '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) send_json(400, ['error' => 'Nombre y correo válidos requeridos']);
        auth_validate_password($password);
        $id = auth_new_id();
        $now = gmdate('c');
        $user = [
            'id' => $id, 'name' => auth_text_limit($name, 80), 'email' => $email,
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT), 'role' => 'admin',
            'permissions' => auth_permissions(), 'blocked' => false,
            'createdAt' => $now, 'updatedAt' => $now, 'lastLoginAt' => $now
        ];
        $db['users'][$id] = $user;
        auth_write_db($usersPath, $db);
        $baseDir = dirname($usersPath);
        $accountDir = $baseDir . DIRECTORY_SEPARATOR . 'accounts' . DIRECTORY_SEPARATOR . $id;
        ensure_directory($accountDir);
        foreach (['leagues.php.json', 'team-tracking.json'] as $legacyName) {
            $legacyPath = $baseDir . DIRECTORY_SEPARATOR . $legacyName;
            $targetPath = $accountDir . DIRECTORY_SEPARATOR . $legacyName;
            if (is_file($legacyPath) && !is_file($targetPath)) @copy($legacyPath, $targetPath);
        }
        session_regenerate_id(true);
        $_SESSION['radarUserId'] = $id;
        send_json(201, ['authenticated' => true, 'user' => auth_public_user($user)]);
    }

    if ($route === '/auth/login' && $method === 'POST') {
        $payload = read_json_body();
        $email = auth_lower(trim((string)($payload['email'] ?? '')));
        $password = (string)($payload['password'] ?? '');
        $user = auth_find_user_by_email($db, $email);
        if (!$user || !password_verify($password, (string)($user['passwordHash'] ?? ''))) {
            send_json(401, ['error' => 'Usuario o contraseña incorrectos']);
        }
        if (!empty($user['blocked'])) send_json(403, ['error' => 'Esta cuenta está bloqueada']);
        $id = (string)$user['id'];
        $db['users'][$id]['lastLoginAt'] = gmdate('c');
        auth_write_db($usersPath, $db);
        session_regenerate_id(true);
        $_SESSION['radarUserId'] = $id;
        send_json(200, ['authenticated' => true, 'user' => auth_public_user($db['users'][$id])]);
    }

    if ($route === '/auth/logout' && $method === 'POST') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        send_json(200, ['ok' => true]);
    }

    if ($route === '/auth/forgot-password' && $method === 'POST') {
        $payload = read_json_body();
        $user = auth_find_user_by_email($db, (string)($payload['email'] ?? ''));
        if ($user && empty($user['blocked'])) {
            $token = bin2hex(random_bytes(32));
            $resets = read_json_file($resetsPath, ['version' => 1, 'tokens' => []]);
            $resets['tokens'][hash('sha256', $token)] = [
                'userId' => $user['id'], 'expiresAt' => time() + 3600, 'createdAt' => gmdate('c')
            ];
            write_json_file($resetsPath, $resets);
            $link = auth_reset_url($token);
            auth_send_reset_email($user, $link);
            if (env_bool('FMS_EXPOSE_RESET_LINK', false)) {
                send_json(200, ['ok' => true, 'message' => 'Si el correo existe, recibirás un enlace.', 'resetLink' => $link]);
            }
        }
        send_json(200, ['ok' => true, 'message' => 'Si el correo existe, recibirás un enlace para restablecer la contraseña.']);
    }

    if ($route === '/auth/reset-password' && $method === 'POST') {
        $payload = read_json_body();
        $token = (string)($payload['token'] ?? '');
        $password = (string)($payload['password'] ?? '');
        auth_validate_password($password);
        $resets = read_json_file($resetsPath, ['version' => 1, 'tokens' => []]);
        $key = hash('sha256', $token);
        $reset = $resets['tokens'][$key] ?? null;
        if (!is_array($reset) || (int)($reset['expiresAt'] ?? 0) < time()) send_json(400, ['error' => 'El enlace no es válido o ha caducado']);
        $id = (string)($reset['userId'] ?? '');
        if (!isset($db['users'][$id])) send_json(400, ['error' => 'La cuenta ya no existe']);
        $db['users'][$id]['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
        $db['users'][$id]['updatedAt'] = gmdate('c');
        unset($resets['tokens'][$key]);
        auth_write_db($usersPath, $db);
        write_json_file($resetsPath, $resets);
        send_json(200, ['ok' => true, 'message' => 'Contraseña actualizada. Ya puedes iniciar sesión.']);
    }
}

function auth_require_user(string $usersPath): array
{
    $db = auth_read_db($usersPath);
    $user = auth_current_user($db);
    if (!$user) send_json(401, ['error' => 'Debes iniciar sesión']);
    return $user;
}

function auth_require_permission(array $user, string $permission): void
{
    if (($user['role'] ?? '') === 'admin') return;
    if (!in_array($permission, (array)($user['permissions'] ?? []), true)) send_json(403, ['error' => 'No tienes acceso a esta sección']);
}

function auth_handle_admin_routes(string $route, string $method, string $usersPath, array $currentUser): void
{
    if (strpos($route, '/admin/') !== 0) return;
    if (($currentUser['role'] ?? '') !== 'admin') send_json(403, ['error' => 'Acceso reservado al administrador']);
    $db = auth_read_db($usersPath);

    if ($route === '/admin/users' && $method === 'GET') {
        send_json(200, ['users' => array_values(array_map('auth_public_user', $db['users'])), 'permissions' => auth_permissions()]);
    }

    if ($route === '/admin/users/save' && $method === 'POST') {
        $payload = read_json_body();
        $id = trim((string)($payload['id'] ?? ''));
        $existing = $id !== '' ? ($db['users'][$id] ?? null) : null;
        $email = auth_lower(trim((string)($payload['email'] ?? '')));
        $name = trim((string)($payload['name'] ?? ''));
        $role = ($payload['role'] ?? '') === 'admin' ? 'admin' : 'user';
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) send_json(400, ['error' => 'Nombre y correo válidos requeridos']);
        foreach ($db['users'] as $candidateId => $candidate) {
            if ($candidateId !== $id && auth_lower((string)($candidate['email'] ?? '')) === $email) send_json(409, ['error' => 'Ya existe una cuenta con ese correo']);
        }
        $password = (string)($payload['password'] ?? '');
        if (!$existing && $password === '') send_json(400, ['error' => 'La contraseña inicial es obligatoria']);
        if ($password !== '') auth_validate_password($password);
        $willBeBlocked = !empty($payload['blocked']);
        if ($existing && $id === (string)$currentUser['id'] && ($role !== 'admin' || $willBeBlocked)) {
            send_json(400, ['error' => 'No puedes quitarte el rol de administrador ni bloquear tu propia cuenta']);
        }
        if ($existing && ($existing['role'] ?? '') === 'admin' && ($role !== 'admin' || $willBeBlocked) && auth_active_admin_count($db, $id) === 0) {
            send_json(400, ['error' => 'Debe quedar al menos un administrador activo']);
        }
        $id = $existing ? $id : auth_new_id();
        $now = gmdate('c');
        $user = array_merge(is_array($existing) ? $existing : [], [
            'id' => $id, 'name' => auth_text_limit($name, 80), 'email' => $email,
            'role' => $role,
            'permissions' => $role === 'admin' ? auth_permissions() : array_values(array_intersect(auth_permissions(), (array)($payload['permissions'] ?? []))),
            'blocked' => $willBeBlocked,
            'createdAt' => $existing['createdAt'] ?? $now, 'updatedAt' => $now
        ]);
        if ($password !== '') $user['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
        $db['users'][$id] = $user;
        auth_write_db($usersPath, $db);
        send_json($existing ? 200 : 201, ['user' => auth_public_user($user)]);
    }

    if ($route === '/admin/users/delete' && $method === 'POST') {
        $payload = read_json_body();
        $id = (string)($payload['id'] ?? '');
        if ($id === (string)$currentUser['id']) send_json(400, ['error' => 'No puedes eliminar tu propia cuenta']);
        if (!isset($db['users'][$id])) send_json(404, ['error' => 'Usuario no encontrado']);
        if (($db['users'][$id]['role'] ?? '') === 'admin' && auth_active_admin_count($db, $id) === 0) {
            send_json(400, ['error' => 'Debe quedar al menos un administrador activo']);
        }
        unset($db['users'][$id]);
        auth_write_db($usersPath, $db);
        send_json(200, ['ok' => true]);
    }

    send_json(404, ['error' => 'Endpoint de administración no encontrado']);
}
