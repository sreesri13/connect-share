plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "in.connecthub.app"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "in.connecthub.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 5
        versionName = "1.0.5"
    }

    signingConfigs {
        create("release") {
            storeFile = file("connecthub-release-key.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "SreeSri@2007"
            keyAlias = "connecthub"
            keyPassword = System.getenv("KEYSTORE_PASSWORD") ?: "SreeSri@2007"
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            isShrinkResources = false
        }
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
