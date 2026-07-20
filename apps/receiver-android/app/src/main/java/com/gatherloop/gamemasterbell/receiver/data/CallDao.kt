package com.gatherloop.gamemasterbell.receiver.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CallDao {
    @Insert
    suspend fun insert(call: CallEntity)

    @Query("SELECT * FROM calls ORDER BY receivedAt DESC LIMIT 50")
    fun recentCalls(): Flow<List<CallEntity>>
}
