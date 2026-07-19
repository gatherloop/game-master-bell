package com.gatherloop.gamemasterbell.receiver.data

import java.time.Instant

/** A received call, as shown on the status screen (FR-D3). */
data class Call(
    val tableCode: String,
    val floor: String,
    val number: String,
    val calledAt: Instant?,
    val receivedAt: Instant,
)

internal fun CallEntity.toCall() = Call(
    tableCode = tableCode,
    floor = floor,
    number = number,
    calledAt = calledAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
    receivedAt = Instant.ofEpochMilli(receivedAt),
)
