import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services)
    alias(libs.plugins.ksp)
}

// Release signing comes from `keystore.properties` (gitignored, never committed — see
// docs/RUNBOOK.md §1). Local debug builds don't need it; CI writes it from repo secrets
// before running `assembleRelease` (see .github/workflows/android-release.yml). Without
// it, `assembleRelease` still works locally but produces an unsigned APK.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}

android {
    namespace = "com.gatherloop.gamemasterbell.receiver"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gatherloop.gamemasterbell.receiver"
        minSdk = 26
        targetSdk = 35
        // Overridable by CI (`-PreleaseVersionCode=… -PreleaseVersionName=…`) so a tagged
        // release's version comes from the git tag instead of a hand-edited constant here —
        // see docs/RUNBOOK.md §2. Local/CI-less builds fall back to these defaults.
        versionCode = (project.findProperty("releaseVersionCode") as String?)?.toInt() ?: 1
        versionName = project.findProperty("releaseVersionName") as String? ?: "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    lint {
        // False positive: fires on any registerForActivityResult call when no
        // androidx.fragment dependency is declared, but this app uses
        // ComponentActivity + Compose only, never Fragment/FragmentActivity.
        disable += "InvalidFragmentVersionForActivityResult"
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging.ktx)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
