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
                        int statusBarTop = insets.getInsets(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()).top;

                        float density = getResources().getDisplayMetrics().density;
                        int navBottomDp = density > 0 ? Math.round(navBottom / density) : navBottom;
                        int notchTopDp = density > 0 ? Math.round(statusBarTop / density) : statusBarTop;

                        getBridge().getWebView().post(() -> {
                            getBridge().getWebView().evaluateJavascript(
                                "document.documentElement.style.setProperty('--android-nav-bottom', '" + navBottomDp + "px');" +
                                "document.documentElement.style.setProperty('--android-notch-top', '" + notchTopDp + "px');",
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
