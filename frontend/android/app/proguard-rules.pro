# REGLAS PARA CAPACITOR (Optimización y Ofuscación)

# Conservar las anotaciones de Capacitor y la comunicación con JS
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# No ofuscar las clases que se comunican con el motor de Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.livestockmanager.app.manual.** { *; }

# Mantener los métodos marcados con @CapacitorPlugin y @NativeMethod
-keep @interface com.getcapacitor.annotation.CapacitorPlugin
-keep @interface com.getcapacitor.NativeMethod

-keepclassmembers class * {
    @com.getcapacitor.NativeMethod public *;
    @com.getcapacitor.annotation.CapacitorPlugin public *;
}

# Mantener la clase principal BridgeActivity y sus componentes
-keep public class * extends com.getcapacitor.BridgeActivity
-keep public class * extends com.getcapacitor.Plugin

# Reglas adicionales para Cordova Plugins (si se usan)
-keep class org.apache.cordova.** { *; }
-keep interface org.apache.cordova.** { *; }

# Mantener Splash Screen
-keep class androidx.core.splashscreen.** { *; }
