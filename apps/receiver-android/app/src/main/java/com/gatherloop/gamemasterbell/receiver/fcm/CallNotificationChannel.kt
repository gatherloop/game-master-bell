package com.gatherloop.gamemasterbell.receiver.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import com.gatherloop.gamemasterbell.receiver.R

/** Channel ids ever shipped by this app. Android channels are immutable once created — a
 *  sound change means a new id, and the old one is deleted on startup (FR-N4). */
private val RETIRED_CHANNEL_IDS = listOf("panggilan_meja", "table_calls_v2", "table_calls_v3")

/** Creates the "Panggilan Meja" channel (FR-D4/FR-N4) with the custom bell sound
 *  (`res/raw/bell_call`) if it doesn't already exist. Safe to call repeatedly. */
fun ensureCallNotificationChannel(context: Context) {
    val channel = NotificationChannel(
        context.getString(R.string.call_notification_channel_id),
        context.getString(R.string.call_notification_channel_name),
        NotificationManager.IMPORTANCE_HIGH,
    ).apply {
        description = context.getString(R.string.call_notification_channel_description)
        enableVibration(true)
        setSound(
            bellCallSoundUri(context),
            // USAGE_NOTIFICATION (not USAGE_NOTIFICATION_EVENT) — matches Android's own
            // default notification AudioAttributes. Some OEM skins (e.g. Realme UI/ColorOS)
            // don't route USAGE_NOTIFICATION_EVENT to the notification volume stream and
            // play it through media volume instead.
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
    }

    notificationManager(context)?.createNotificationChannel(channel)
}

/** Deletes channel ids retired by earlier app versions (FR-N4). Safe to call repeatedly —
 *  deleting an already-absent channel id is a no-op. */
fun deleteRetiredCallNotificationChannels(context: Context) {
    val manager = notificationManager(context) ?: return
    RETIRED_CHANNEL_IDS.forEach(manager::deleteNotificationChannel)
}

private fun bellCallSoundUri(context: Context): Uri =
    "android.resource://${context.packageName}/${R.raw.bell_call}".toUri()

private fun notificationManager(context: Context): NotificationManager? =
    ContextCompat.getSystemService(context, NotificationManager::class.java)
