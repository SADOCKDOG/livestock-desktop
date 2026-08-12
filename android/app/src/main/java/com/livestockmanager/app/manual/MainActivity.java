package com.livestockmanager.app.manual;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Debe ir ANTES de super para que el tema se aplique correctamente
        SplashScreen.installSplashScreen(this);

        // Habilitar debugging del WebView ANTES de que Capacitor lo cree
        WebView.setWebContentsDebuggingEnabled(true);

        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }
    }
}
