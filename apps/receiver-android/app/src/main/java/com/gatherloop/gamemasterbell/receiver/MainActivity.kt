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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.gatherloop.gamemasterbell.receiver.data.Call
import com.gatherloop.gamemasterbell.receiver.data.CallsRepository
import com.gatherloop.gamemasterbell.receiver.fcm.GAME_MASTERS_TOPIC
import com.gatherloop.gamemasterbell.receiver.fcm.deleteRetiredCallNotificationChannels
import com.gatherloop.gamemasterbell.receiver.fcm.ensureCallNotificationChannel
import com.gatherloop.gamemasterbell.receiver.ui.StatusScreen
import com.gatherloop.gamemasterbell.receiver.ui.theme.ReceiverAndroidTheme
import com.google.firebase.Firebase
import com.google.firebase.messaging.messaging
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private var notificationsGranted by mutableStateOf(false)
    private var topicSubscribed by mutableStateOf<Boolean?>(null)
    private var recentCalls by mutableStateOf<List<Call>>(emptyList())

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            notificationsGranted = granted
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationsGranted = hasNotificationPermission()

        ensureCallNotificationChannel(this)
        deleteRetiredCallNotificationChannels(this)
        subscribeToGameMastersTopic()
        observeRecentCalls()

        setContent {
            ReceiverAndroidTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    StatusScreen(
                        notificationsGranted = notificationsGranted,
                        topicSubscribed = topicSubscribed,
                        recentCalls = recentCalls,
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

    private fun observeRecentCalls() {
        val repository = CallsRepository.getInstance(this)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                repository.recentCalls().collect { calls -> recentCalls = calls }
            }
        }
    }

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }
}
