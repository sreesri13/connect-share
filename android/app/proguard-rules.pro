# Add project specific ProGuard rules here.

# Preserve Capacitor native bridges and plugin methods
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
   @com.getcapacitor.PluginMethod public *;
   @com.getcapacitor.annotation.CapacitorPlugin public *;
}

# Preserve AndroidX WebKit / WebView javascript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve application main activity and entry points
-keep class in.connecthub.app.** { *; }

# Preserve line numbers and attributes for crash deobfuscation mapping
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*

# Suppress harmless warnings during optimization
-dontwarn javax.annotation.**
-dontwarn org.checkerframework.**
