package com.gatherloop.gamemasterbell.receiver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = GameMasterGreenLight,
    secondary = GameMasterAmber,
    background = Neutral10,
)

private val LightColorScheme = lightColorScheme(
    primary = GameMasterGreen,
    secondary = GameMasterAmber,
    background = Neutral95,
)

@Composable
fun ReceiverAndroidTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content,
    )
}
