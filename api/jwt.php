<?php
/* ============================================================
   INTENTIONALLY VULNERABLE — training target, localhost only.
   Bugs on purpose: hardcoded weak secret, accepts alg "none",
   no expiry enforcement. See VULNERABILITIES.md.
   ============================================================ */
define('JWT_SECRET', 'secret123');

function b64url_enc($d) { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64url_dec($d) { return base64_decode(strtr($d, '-_', '+/')); }

function jwt_issue(array $payload): string {
    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $payload['iat'] = time();
    $payload['exp'] = time() + 3600; // present, but never checked on verify (bug)
    $segs = [b64url_enc(json_encode($header)), b64url_enc(json_encode($payload))];
    $sig = hash_hmac('sha256', implode('.', $segs), JWT_SECRET, true);
    $segs[] = b64url_enc($sig);
    return implode('.', $segs);
}

function jwt_verify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $header = json_decode(b64url_dec($h), true);
    $payload = json_decode(b64url_dec($p), true);
    if (!$header || !$payload) return null;

    // BUG: trusts the client-specified algorithm, including "none"
    if (strtolower($header['alg'] ?? '') === 'none') {
        return $payload;
    }
    $expected = hash_hmac('sha256', "$h.$p", JWT_SECRET, true);
    if (!hash_equals($expected, b64url_dec($s))) return null;
    // BUG: no exp/iat check here at all
    return $payload;
}
