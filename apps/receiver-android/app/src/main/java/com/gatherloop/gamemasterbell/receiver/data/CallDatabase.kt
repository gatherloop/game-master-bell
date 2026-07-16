package com.gatherloop.gamemasterbell.receiver.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [CallEntity::class], version = 1, exportSchema = false)
abstract class CallDatabase : RoomDatabase() {
    abstract fun callDao(): CallDao

    companion object {
        @Volatile private var instance: CallDatabase? = null

        fun getInstance(context: Context): CallDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    CallDatabase::class.java,
                    "calls.db",
                ).build().also { instance = it }
            }
    }
}
