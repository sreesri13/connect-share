# Add project specific ProGuard rules here.

# Preserve Capacitor native bridges and plugin methods
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class * {
   @com.getcapacitor.PluginMethod public *;
   @com.getcapacitor.annotation.CapacitorPlugin public *;
}

# Preserve line numbers for crash deobfuscation mapping
-keepattributes SourceFile,LineNumberTable
