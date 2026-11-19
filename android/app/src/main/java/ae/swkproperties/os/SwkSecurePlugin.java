package ae.swkproperties.os;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.Locale;
import java.util.concurrent.Executor;

/** Native security surface: Keystore-backed secret storage (AES-256-GCM), biometric gate, device integrity, duty GPS service. */
@CapacitorPlugin(name = "SwkSecure")
public class SwkSecurePlugin extends Plugin {
    private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    private android.content.SharedPreferences prefs;

    private synchronized android.content.SharedPreferences store() throws Exception {
        if (prefs == null) {
            MasterKey key = new MasterKey.Builder(getContext()).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
            prefs = EncryptedSharedPreferences.create(getContext(), "swk_secure", key,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV, EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        }
        return prefs;
    }

    @PluginMethod
    public void secureSet(PluginCall call) {
        String k = call.getString("key"), v = call.getString("value");
        if (k == null || v == null) { call.reject("key and value required"); return; }
        try { store().edit().putString(k, v).apply(); call.resolve(); } catch (Exception e) { call.reject("secure_store_failed"); }
    }

    @PluginMethod
    public void secureGet(PluginCall call) {
        try { JSObject r = new JSObject(); r.put("value", store().getString(call.getString("key", ""), null)); call.resolve(r); } catch (Exception e) { call.reject("secure_store_failed"); }
    }

    @PluginMethod
    public void secureRemove(PluginCall call) {
        try { store().edit().remove(call.getString("key", "")).apply(); call.resolve(); } catch (Exception e) { call.reject("secure_store_failed"); }
    }

    @SuppressLint("HardwareIds")
    @PluginMethod
    public void deviceInfo(PluginCall call) {
        String id = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
        JSObject r = new JSObject();
        r.put("device_id", "SWK-AND-" + (id == null || id.isEmpty() ? "UNKNOWN" : id.toUpperCase(Locale.ROOT)));
        r.put("device_name", Build.MANUFACTURER + " " + Build.MODEL);
        r.put("os_version", "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
        r.put("app_version", BuildConfig.VERSION_NAME);
        call.resolve(r);
    }

    /** Best-effort tamper signals. Never a guarantee: a determined attacker can hide them. */
    @PluginMethod
    public void integrity(PluginCall call) {
        boolean debuggable = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        boolean rooted = Build.TAGS != null && Build.TAGS.contains("test-keys");
        for (String p : new String[]{"/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/app/Superuser.apk", "/data/local/bin/su", "/data/local/xbin/su", "/su/bin/su"}) if (new File(p).exists()) rooted = true;
        for (String pkg : new String[]{"com.topjohnwu.magisk", "eu.chainfire.supersu", "com.koushikdutta.superuser"}) {
            try { getContext().getPackageManager().getPackageInfo(pkg, 0); rooted = true; } catch (PackageManager.NameNotFoundException ignored) { }
        }
        boolean emulator = Build.FINGERPRINT.startsWith("generic") || Build.MODEL.contains("Emulator") || Build.HARDWARE.contains("goldfish") || Build.HARDWARE.contains("ranchu");
        JSObject r = new JSObject(); r.put("debuggable", debuggable); r.put("rooted", rooted); r.put("emulator", emulator);
        call.resolve(r);
    }

    @PluginMethod
    public void biometricAvailable(PluginCall call) {
        JSObject r = new JSObject(); r.put("available", BiometricManager.from(getContext()).canAuthenticate(AUTH) == BiometricManager.BIOMETRIC_SUCCESS); call.resolve(r);
    }

    @PluginMethod
    public void biometricAuth(PluginCall call) {
        if (BiometricManager.from(getContext()).canAuthenticate(AUTH) != BiometricManager.BIOMETRIC_SUCCESS) { call.reject("biometric_unavailable"); return; }
        FragmentActivity a = getActivity();
        Executor ex = ContextCompat.getMainExecutor(getContext());
        getActivity().runOnUiThread(() -> {
            BiometricPrompt bp = new BiometricPrompt(a, ex, new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult res) { JSObject r = new JSObject(); r.put("verified", true); call.resolve(r); }
                @Override public void onAuthenticationError(int code, CharSequence msg) { call.reject("auth_error:" + code); }
            });
            bp.authenticate(new BiometricPrompt.PromptInfo.Builder().setTitle(getContext().getString(R.string.biometric_title)).setSubtitle(call.getString("reason", "Unlock your session")).setAllowedAuthenticators(AUTH).build());
        });
    }

    @PluginMethod
    public void startDuty(PluginCall call) {
        int sessionId = call.getInt("sessionId", -1);
        String serverUrl = call.getString("serverUrl", ""), token = call.getString("sessionToken", "");
        JSObject r = new JSObject();
        if (sessionId <= 0) { r.put("started", false); r.put("reason", "invalid_session"); call.resolve(r); return; }
        if (token.isEmpty()) { r.put("started", false); r.put("reason", "not_signed_in"); call.resolve(r); return; }
        if (!SwkDutyLocationService.isAllowedServer(serverUrl)) { r.put("started", false); r.put("reason", "insecure_server"); call.resolve(r); return; }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            String[] perms = Build.VERSION.SDK_INT >= 33 ? new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.POST_NOTIFICATIONS} : new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION};
            getActivity().runOnUiThread(() -> ActivityCompat.requestPermissions(getActivity(), perms, 7301));
            r.put("started", false); r.put("reason", "location_permission_required"); call.resolve(r); return;
        }
        Intent i = new Intent(getContext(), SwkDutyLocationService.class).setAction(SwkDutyLocationService.ACTION_START_DUTY)
            .putExtra(SwkDutyLocationService.EXTRA_SESSION_ID, sessionId).putExtra(SwkDutyLocationService.EXTRA_LOCATION, call.getString("assignedLocation", ""))
            .putExtra(SwkDutyLocationService.EXTRA_SERVER_URL, serverUrl).putExtra(SwkDutyLocationService.EXTRA_TOKEN, token).putExtra(SwkDutyLocationService.EXTRA_DEVICE_ID, call.getString("deviceId", ""));
        ContextCompat.startForegroundService(getContext(), i);
        r.put("started", true); call.resolve(r);
    }

    @PluginMethod
    public void stopDuty(PluginCall call) {
        getContext().startService(new Intent(getContext(), SwkDutyLocationService.class).setAction(SwkDutyLocationService.ACTION_STOP_DUTY));
        call.resolve();
    }

    @PluginMethod
    public void telemetry(PluginCall call) {
        JSObject r = new JSObject();
        r.put("battery_pct", DeviceTelemetry.batteryPercent(getContext())); r.put("is_charging", DeviceTelemetry.isCharging(getContext()));
        r.put("network_type", DeviceTelemetry.networkType(getContext())); r.put("duty_service_running", SwkDutyLocationService.isRunning());
        call.resolve(r);
    }

    /** One fresh high-accuracy fix, including the Android mock-provider flag (the server rejects mock fixes as attendance evidence). */
    @PluginMethod
    public void getFix(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            String[] perms = Build.VERSION.SDK_INT >= 33 ? new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.POST_NOTIFICATIONS} : new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION};
            getActivity().runOnUiThread(() -> ActivityCompat.requestPermissions(getActivity(), perms, 7301));
            call.reject("location_permission_required"); return;
        }
        try {
            LocationServices.getFusedLocationProviderClient(getContext())
                .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, new CancellationTokenSource().getToken())
                .addOnSuccessListener(l -> {
                    if (l == null) { call.reject("no_fix"); return; }
                    JSObject r = new JSObject();
                    r.put("lat", l.getLatitude()); r.put("lng", l.getLongitude()); r.put("accuracy", l.getAccuracy());
                    r.put("capturedAt", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US) {{ setTimeZone(java.util.TimeZone.getTimeZone("UTC")); }}.format(new java.util.Date(l.getTime())));
                    r.put("mock", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? l.isMock() : l.isFromMockProvider());
                    call.resolve(r);
                })
                .addOnFailureListener(e -> call.reject("no_fix"));
        } catch (SecurityException e) { call.reject("location_permission_required"); }
    }
}
