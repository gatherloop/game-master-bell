package com.gatherloop.gamemasterbell.receiver.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import androidx.core.content.ContextCompat
import com.gatherloop.gamemasterbell.receiver.R

/** Creates the "Panggilan Meja" channel (FR-D4) if it doesn't already exist. Safe to call repeatedly. */
fun ensureCallNotificationChannel(context: Context) {
    val channel = NotificationChannel(
        context.getString(R.string.call_notification_channel_id),
        context.getString(R.string.call_notification_channel_name),
        NotificationManager.IMPORTANCE_HIGH,
    ).apply {
        description = context.getString(R.string.call_notification_channel_description)
        enableVibration(true)
        setSound(
            android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
    }

    ContextCompat.getSystemService(context, NotificationManager::class.java)
        ?.createNotificationChannel(channel)
}
