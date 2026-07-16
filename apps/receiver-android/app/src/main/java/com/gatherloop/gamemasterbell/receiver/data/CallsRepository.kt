package com.gatherloop.gamemasterbell.receiver.data

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** Persists and reads back received calls, backed by Room. */
class CallsRepository(private val callDao: CallDao) {

    fun recentCalls(): Flow<List<Call>> = callDao.recentCalls().map { entities -> entities.map { it.toCall() } }

    suspend fun recordCall(tableCode: String, floor: String, number: String, calledAt: String?) {
        callDao.insert(
            CallEntity(
                tableCode = tableCode,
                floor = floor,
                number = number,
                calledAt = calledAt,
                receivedAt = System.currentTimeMillis(),
            ),
        )
    }

    companion object {
        @Volatile private var instance: CallsRepository? = null

        fun getInstance(context: Context): CallsRepository =
            instance ?: synchronized(this) {
                instance ?: CallsRepository(CallDatabase.getInstance(context).callDao()).also { instance = it }
            }
    }
}
