package com.gatherloop.gamemasterbell.receiver.fcm

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.gatherloop.gamemasterbell.receiver.MainActivity
import com.gatherloop.gamemasterbell.receiver.R
import com.gatherloop.gamemasterbell.receiver.data.CallsRepository
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Receives calls pushed to the `game-masters` topic. The API always sends data-only
 * messages (FR-A2v3) so `message.notification` is never populated here — title/body are
 * always composed in-app from `message.data` (FR-N2), and the notification is shown on
 * the custom-sound channel (FR-N2/FR-N4), persisting each call so the status screen can
 * list recent calls (FR-D3/FR-N5).
 */
class GameMasterMessagingService : FirebaseMessagingService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        showCallNotification(message)
        recordCall(message)
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun recordCall(message: RemoteMessage) {
        val tableCode = message.data["tableCode"] ?: return
        val floor = message.data["floor"] ?: return
        val number = message.data["number"] ?: return
        val calledAt = message.data["calledAt"]

        val repository = CallsRepository.getInstance(this)
        serviceScope.launch { repository.recordCall(tableCode, floor, number, calledAt) }
    }

    private fun showCallNotification(message: RemoteMessage) {
        if (!hasNotificationPermission()) return

        ensureCallNotificationChannel(this)

        val number = message.data["number"]
        val floor = message.data["floor"]
        val title = getString(R.string.call_notification_title)
        val body = if (number != null && floor != null) {
            getString(R.string.call_notification_body, number, floor)
        } else {
            getString(R.string.call_notification_fallback_body)
        }

        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, getString(R.string.call_notification_channel_id))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()

        NotificationManagerCompat.from(this).notify(notificationId(message), notification)
    }

    /** A unique id per call (FR-N3) so repeated calls stack and each re-alerts, instead of
     *  a later call silently replacing an earlier unread one. FCM assigns every downstream
     *  message its own `messageId`; hashing it gives a stable, collision-free-in-practice
     *  notification id. Falls back to a random id on the rare message without one. */
    private fun notificationId(message: RemoteMessage): Int =
        message.messageId?.hashCode() ?: UUID.randomUUID().hashCode()

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }
}
