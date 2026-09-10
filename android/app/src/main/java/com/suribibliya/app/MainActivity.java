package com.suribibliya.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fix: Prevent duplicate IME padding and pass navigation bar height to CSS
        // for Xiaomi (MIUI/HyperOS) and all Android navigation bar heights.
        getBridge().getWebView().post(() -> {
            View parent = (View) getBridge().getWebView().getParent();
            if (parent != null) {
                ViewCompat.setOnApplyWindowInsetsListener(parent, (v, insets) -> {
                    v.setPadding(0, 0, 0, 0);

                    try {
                        int navBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                        float density = getResources().getDisplayMetrics().density;
                        int navBottomDp = density > 0 ? Math.round(navBottom / density) : navBottom;

                        getBridge().getWebView().post(() -> {
                            getBridge().getWebView().evaluateJavascript(
                                "document.documentElement.style.setProperty('--android-nav-bottom', '" + navBottomDp + "px');",
                                null
                            );
                        });
                    } catch (Exception ignored) {
                    }

                    return insets;
                });
                getBridge().getWebView().requestApplyInsets();
            }
        });
    }
}
