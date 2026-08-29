# Flutter Core Framework
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Flutter InAppWebView plugin & AndroidX WebKit
-keep class com.pichillilorenzo.flutter_inappwebview_android.** { *; }
-keep interface com.pichillilorenzo.flutter_inappwebview_android.** { *; }
-keep class androidx.webkit.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Google Sign-In & Google Play Services
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.android.gms.common.** { *; }

# Application Entry Points
-keep class in.connecthub.app.** { *; }

# Preserve line numbers and source attributes for mapping.txt deobfuscation
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*

# Suppress harmless build warnings & Play Core optional classes
-dontwarn com.google.android.play.core.**
-dontwarn com.google.android.gms.**
-dontwarn javax.annotation.**
-dontwarn org.checkerframework.**
-dontwarn okio.**
-dontwarn com.google.errorprone.annotations.**
