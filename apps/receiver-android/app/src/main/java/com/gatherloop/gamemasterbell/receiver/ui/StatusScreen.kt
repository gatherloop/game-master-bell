package com.gatherloop.gamemasterbell.receiver.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.gatherloop.gamemasterbell.receiver.R
import com.gatherloop.gamemasterbell.receiver.ui.theme.ReceiverAndroidTheme

@Composable
fun StatusScreen(
    notificationsGranted: Boolean,
    topicSubscribed: Boolean?,
    onRequestNotificationPermission: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Text(
            text = "Game Master Bell",
            style = MaterialTheme.typography.headlineMedium,
        )
        Text(
            text = "Aplikasi penerima panggilan game master",
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(
            text = if (notificationsGranted) {
                "Notifikasi aktif — kamu akan menerima panggilan di sini"
            } else {
                "Notifikasi belum diizinkan"
            },
            style = MaterialTheme.typography.bodyLarge,
        )
        Text(
            text = when (topicSubscribed) {
                true -> stringResource(R.string.topic_subscribed)
                false -> stringResource(R.string.topic_subscribe_failed)
                null -> stringResource(R.string.topic_subscribing)
            },
            style = MaterialTheme.typography.bodyLarge,
        )
        if (!notificationsGranted) {
            Button(onClick = onRequestNotificationPermission) {
                Text("Aktifkan notifikasi")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun StatusScreenNotificationsGrantedPreview() {
    ReceiverAndroidTheme {
        StatusScreen(notificationsGranted = true, topicSubscribed = true, onRequestNotificationPermission = {})
    }
}

@Preview(showBackground = true)
@Composable
private fun StatusScreenNotificationsNotGrantedPreview() {
    ReceiverAndroidTheme {
        StatusScreen(notificationsGranted = false, topicSubscribed = null, onRequestNotificationPermission = {})
    }
}
