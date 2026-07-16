package com.gatherloop.gamemasterbell.receiver

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.gatherloop.gamemasterbell.receiver.fcm.GAME_MASTERS_TOPIC
import com.gatherloop.gamemasterbell.receiver.fcm.ensureCallNotificationChannel
import com.gatherloop.gamemasterbell.receiver.ui.StatusScreen
import com.gatherloop.gamemasterbell.receiver.ui.theme.ReceiverAndroidTheme
import com.google.firebase.Firebase
import com.google.firebase.messaging.messaging

class MainActivity : ComponentActivity() {

    private var notificationsGranted by mutableStateOf(false)
    private var topicSubscribed by mutableStateOf<Boolean?>(null)

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            notificationsGranted = granted
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationsGranted = hasNotificationPermission()

        ensureCallNotificationChannel(this)
        subscribeToGameMastersTopic()

        setContent {
            ReceiverAndroidTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    StatusScreen(
                        notificationsGranted = notificationsGranted,
                        topicSubscribed = topicSubscribed,
                        onRequestNotificationPermission = {
                            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                        },
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        notificationsGranted = hasNotificationPermission()
    }

    private fun subscribeToGameMastersTopic() {
        Firebase.messaging.subscribeToTopic(GAME_MASTERS_TOPIC)
            .addOnCompleteListener { task -> topicSubscribed = task.isSuccessful }
    }

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }
}
