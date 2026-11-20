
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  const bundleIdentifier = process.env.PADEL_IOS_BUNDLE_IDENTIFIER
  const suffix = '.apps.googleusercontent.com'
  if (!iosClientId) return config
  if (!iosClientId.endsWith(suffix) || !bundleIdentifier) {
    throw new Error('Set a valid Google iOS client ID and PADEL_IOS_BUNDLE_IDENTIFIER together.')
  }
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier },
    plugins: [...(config.plugins ?? []), ['react-native-nitro-google-signin', {
      iosUrlScheme: 'com.googleusercontent.apps.' + iosClientId.slice(0, -suffix.length),
    }]],
  }
}
