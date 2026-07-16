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
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.gatherloop.gamemasterbell.receiver.ui.theme.ReceiverAndroidTheme

@Composable
fun StatusScreen(
    notificationsGranted: Boolean,
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
        StatusScreen(notificationsGranted = true, onRequestNotificationPermission = {})
    }
}

@Preview(showBackground = true)
@Composable
private fun StatusScreenNotificationsNotGrantedPreview() {
    ReceiverAndroidTheme {
        StatusScreen(notificationsGranted = false, onRequestNotificationPermission = {})
    }
}
