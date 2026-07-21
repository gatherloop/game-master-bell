package com.gatherloop.gamemasterbell.receiver.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.gatherloop.gamemasterbell.receiver.R
import com.gatherloop.gamemasterbell.receiver.data.Call
import com.gatherloop.gamemasterbell.receiver.ui.theme.ReceiverAndroidTheme
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val callTimeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault())

@Composable
fun StatusScreen(
    notificationsGranted: Boolean,
    topicSubscribed: Boolean?,
    recentCalls: List<Call>,
    onRequestNotificationPermission: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
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

        HorizontalDivider()

        Text(
            text = stringResource(R.string.recent_calls_title),
            style = MaterialTheme.typography.titleMedium,
        )
        if (recentCalls.isEmpty()) {
            Text(
                text = stringResource(R.string.recent_calls_empty),
                style = MaterialTheme.typography.bodyMedium,
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(recentCalls) { call -> RecentCallRow(call) }
            }
        }
    }
}

@Composable
private fun RecentCallRow(call: Call, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = stringResource(R.string.call_notification_body, call.number, call.floor),
            style = MaterialTheme.typography.bodyLarge,
        )
        Text(
            text = callTimeFormatter.format(call.calledAt ?: call.receivedAt),
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun StatusScreenNotificationsGrantedPreview() {
    ReceiverAndroidTheme {
        StatusScreen(
            notificationsGranted = true,
            topicSubscribed = true,
            recentCalls = listOf(
                Call(
                    tableCode = "2-05",
                    floor = "2",
                    number = "05",
                    calledAt = Instant.now(),
                    receivedAt = Instant.now(),
                ),
            ),
            onRequestNotificationPermission = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun StatusScreenNotificationsNotGrantedPreview() {
    ReceiverAndroidTheme {
        StatusScreen(
            notificationsGranted = false,
            topicSubscribed = null,
            recentCalls = emptyList(),
            onRequestNotificationPermission = {},
        )
    }
}
