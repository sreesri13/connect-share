package `in`.connecthub.app

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity: FlutterFragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Enable edge-to-edge support for Android 15 (SDK 35+) and backward compatibility
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        // Ensure content extends into system bars seamlessly
        WindowCompat.setDecorFitsSystemWindows(window, false)
        
        // Optimize for high refresh rate displays (90Hz / 120Hz)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.attributes.preferredDisplayModeId = 0
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.attributes.preferredRefreshRate = 0f
        }
        
        // Enable hardware accelerated window drawing
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )
    }
}

