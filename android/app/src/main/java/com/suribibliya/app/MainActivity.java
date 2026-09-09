package com.suribibliya.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fix: Prevent Capacitor 8 SystemBars from applying duplicate bottom padding
        // when the software keyboard (IME) is displayed. Since windowSoftInputMode="adjustResize"
        // is used in AndroidManifest.xml, Android already resizes the window.
        // Applying extra IME padding squishes the WebView and reveals the dark gray window background.
        getBridge().getWebView().post(() -> {
            View parent = (View) getBridge().getWebView().getParent();
            if (parent != null) {
                ViewCompat.setOnApplyWindowInsetsListener(parent, (v, insets) -> {
                    v.setPadding(0, 0, 0, 0);
                    return insets;
                });
                getBridge().getWebView().requestApplyInsets();
            }
        });
    }
}
