import { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Modal, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { StatusBar } from 'expo-status-bar'
import { Button } from '@/components/ui/button'
import { pointValid, type Point } from './venues-model'
import { leafletScript, leafletStyles } from './map-vendor'

const BASE = 'https://padelcheck.local/'
export function VenueMap({ center, initial, onConfirm, onCancel }: { center: Point; initial: Point | null; onConfirm: (point: Point) => void; onCancel: () => void }) {
  const [point, select] = useState<Point | null>(initial), [loaded, ready] = useState(false), [failed, fail] = useState(false), [attempt, retry] = useState(0)
  const selectedPoint = useRef<Point | null>(initial)
  const html = useMemo(() => {
    if (!pointValid(center)) return ''
    // Only validated numeric coordinates are embedded. No user text, cookies or credentials enter HTML.
    const remembered = selectedPoint.current
    const config = JSON.stringify({ center: [center.latitude, center.longitude], initial: remembered && pointValid(remembered) ? [remembered.latitude, remembered.longitude] : null })
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src https://tile.openstreetmap.org data:;style-src 'unsafe-inline';script-src 'unsafe-inline';"><style>${leafletStyles}html,body,#map{margin:0;height:100%;width:100%}#center{position:absolute;bottom:28px;left:12px;z-index:1000;background:#fafaeb;border:1px solid #929195;border-radius:8px;padding:12px;font:500 14px sans-serif;color:#120f18}</style></head><body><div id="map" aria-label="Mapa de la sede"></div><button id="center" type="button">Marcar centro</button><script>${leafletScript}</script><script>
      var cfg=${config}, loaded=false, marker;
      function send(value){window.ReactNativeWebView.postMessage(JSON.stringify(value))}
      var map=L.map('map').setView(cfg.center,14);map.attributionControl.setPrefix(false);
      var timeout=setTimeout(function(){if(!loaded)send({kind:'error'})},12000);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map).on('tileload',function(){loaded=true;clearTimeout(timeout);send({kind:'loaded'})});
      function select(lat,lon){if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;if(marker)marker.remove();marker=L.circleMarker([lat,lon],{radius:10,color:'#120f18',fillColor:'#c9cf38',fillOpacity:1,weight:3}).addTo(map);send({kind:'point',latitude:lat,longitude:lon})}
      map.on('click',function(e){select(e.latlng.lat,e.latlng.lng)});document.getElementById('center').onclick=function(){var p=map.getCenter();select(p.lat,p.lng)};
      if(cfg.initial)select(cfg.initial[0],cfg.initial[1]);
      </script></body></html>`
  }, [center.latitude, center.longitude, attempt])
  return <Modal onRequestClose={onCancel} animationType="slide"><SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}><StatusBar style="dark" />
    <View style={{ gap: 12, padding: 16 }}><Text className="font-inter-600" style={{ fontSize: 18, lineHeight: 24, color: '#120f18' }}>Ubicación de la sede</Text><Text className="font-sans" style={{ fontSize: 14, lineHeight: 20, color: '#605e64' }}>Tocá el mapa o movelo y marcá el centro. La vista inicial es una referencia de la localidad.</Text></View>
    <View style={{ marginHorizontal: 16, minHeight: 240, flex: 1, overflow: 'hidden', borderRadius: 8 }}>
      <WebView key={attempt} source={{ html, baseUrl: BASE }} originWhitelist={['https://padelcheck.local']} userAgent="PadelCheck/1.0 (+https://padelcheck-fe.pages.dev)" cacheEnabled thirdPartyCookiesEnabled={false} sharedCookiesEnabled={false} domStorageEnabled={false} javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={request => { if (request.url === BASE || request.url === 'about:blank') return true; if (request.url === 'https://www.openstreetmap.org/copyright') void Linking.openURL(request.url); return false }}
        onError={() => fail(true)} onMessage={event => { try { const value = JSON.parse(event.nativeEvent.data); if (value.kind === 'loaded') { ready(true); fail(false) } else if (value.kind === 'error') fail(true); else if (value.kind === 'point' && typeof value.latitude === 'number' && typeof value.longitude === 'number' && pointValid(value)) { const next = { latitude: value.latitude, longitude: value.longitude }; selectedPoint.current = next; select(next) } } catch { /* Ignore malformed messages from a WebView. */ } }} />
      {!loaded && !failed && <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: '#e7e7e8', justifyContent: 'center', alignItems: 'center', gap: 12 }}><ActivityIndicator color="#120f18" /><Text accessibilityLiveRegion="polite" className="font-sans" style={{ fontSize: 14, lineHeight: 20, color: '#605e64' }}>Cargando mapa…</Text></View>}
    </View>
    <View style={{ gap: 12, padding: 16 }}>{failed && <><Text accessibilityRole="alert" className="font-sans" style={{ fontSize: 14, lineHeight: 20, color: '#aa3030' }}>No pudimos cargar el mapa. Podés reintentar o volver sin ubicación exacta.</Text><Button onPress={() => { ready(false); fail(false); retry(n => n + 1) }} style={{ height: 44, borderRadius: 8 }}>Reintentar mapa</Button></>}
      {point && <Text accessibilityLiveRegion="polite" className="font-inter-500" style={{ fontSize: 14, lineHeight: 20, color: '#120f18' }}>Punto seleccionado</Text>}
      <Button style={{ height: 48, borderRadius: 8 }} disabled={!point || !loaded || failed} onPress={() => point && onConfirm(point)}>Confirmar punto de sede</Button><Button style={{ height: 48, borderRadius: 8, backgroundColor: '#e7e7e8', borderWidth: 0 }} variant="secondary" onPress={onCancel}>Cancelar</Button>
    </View>
  </SafeAreaView></Modal>
}
