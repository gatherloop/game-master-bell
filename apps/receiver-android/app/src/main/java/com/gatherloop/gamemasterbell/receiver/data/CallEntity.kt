package com.gatherloop.gamemasterbell.receiver.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/** A single received call, persisted so the status screen can list recent calls (FR-D3). */
@Entity(tableName = "calls")
data class CallEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val tableCode: String,
    val floor: String,
    val number: String,
    val calledAt: String?,
    val receivedAt: Long,
)
