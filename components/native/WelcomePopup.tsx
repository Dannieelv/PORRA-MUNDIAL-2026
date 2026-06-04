/**
 * WelcomePopup.tsx — React Native / Expo
 *
 * Coloca el archivo del jugador en:
 *   assets/images/jugador.png
 *
 * Uso en App.tsx / _layout.tsx:
 *   <WelcomePopup />
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── constantes ────────────────────────────────────────────
const STORAGE_KEY = '@porrita_welcome_v1';
const { width, height } = Dimensions.get('window');
const CARD_W = Math.min(width * 0.82, 340);
const CIRCLE_SIZE = CARD_W * 0.72;

// ─── componente ─────────────────────────────────────────────
export default function WelcomePopup() {
  const [visible, setVisible] = useState(false);

  // valores animados
  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const circleScale     = useRef(new Animated.Value(0.7)).current;
  const imageTranslateY = useRef(new Animated.Value(60)).current;
  const imageOpacity    = useRef(new Animated.Value(0)).current;
  const textTranslateY  = useRef(new Animated.Value(40)).current;
  const textOpacity     = useRef(new Animated.Value(0)).current;

  // ── comprobar si ya se mostró en esta sesión ──
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (!seen) setVisible(true);
      } catch {
        setVisible(true); // si falla, mostrarlo igual
      }
    })();
  }, []);

  // ── animación de entrada ──
  useEffect(() => {
    if (!visible) return;

    Animated.sequence([
      // 1. overlay aparece
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      // 2. en paralelo: círculo + imagen (delay 300ms) + texto (delay 1100ms)
      Animated.parallel([
        Animated.spring(circleScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(300),
          Animated.parallel([
            Animated.timing(imageOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.spring(imageTranslateY, {
              toValue: 0,
              friction: 7,
              tension: 55,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(1100),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 380,
              useNativeDriver: true,
            }),
            Animated.spring(textTranslateY, {
              toValue: 0,
              friction: 7,
              tension: 55,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    ]).start();
  }, [visible]);

  // ── cerrar con fade out ──
  const close = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(async () => {
      setVisible(false);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, '1');
      } catch { /* silencioso */ }
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* overlay oscuro — tap cierra */}
      <Pressable style={StyleSheet.absoluteFill} onPress={close}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>

          {/* card negra — tap también cierra */}
          <Pressable onPress={close}>
            <View style={styles.card}>

              {/* círculo verde decorativo */}
              <Animated.View
                style={[
                  styles.circle,
                  { transform: [{ scale: circleScale }] },
                ]}
              />

              {/* imagen del jugador */}
              <Animated.Image
                source={require('../../assets/images/jugador.png')}
                style={[
                  styles.playerImage,
                  {
                    opacity: imageOpacity,
                    transform: [{ translateY: imageTranslateY }],
                  },
                ]}
                resizeMode="contain"
              />

              {/* texto */}
              <Animated.View
                style={[
                  styles.textWrap,
                  {
                    opacity: textOpacity,
                    transform: [{ translateY: textTranslateY }],
                  },
                ]}
              >
                <Text style={styles.textTop}>Porrita del</Text>
                <Text style={styles.textBottom}>Mundial 2026</Text>
              </Animated.View>

            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── estilos ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_W,
    backgroundColor: '#000',
    borderRadius: 28,
    alignItems: 'center',
    paddingBottom: 36,
    paddingTop: 28,
    overflow: 'hidden',
    // sombra suave
    shadowColor: '#7C61D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  circle: {
    position: 'absolute',
    top: 10,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#15803d',
  },
  playerImage: {
    width: CARD_W * 0.75,
    height: CARD_W * 0.85,
    marginTop: CIRCLE_SIZE * 0.1,
    zIndex: 1,
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 12,
    zIndex: 1,
  },
  textTop: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  textBottom: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
});
