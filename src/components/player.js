import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import Swiper from 'react-native-swiper';
import { useSelector } from 'react-redux';
import Video from 'react-native-video';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_DURATION = 5000;
const DOWNLOADED_PATHS_KEY = 'downloadedPaths';
const CONTENT_HASH_KEY = 'contentHash';

function Player() {
  const data = useSelector((state) => state.user);
  const [playlistContent, setPlaylistContent] = useState({});
  const [currentIndices, setCurrentIndices] = useState({});
  const [videoStates, setVideoStates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [allContentReady, setAllContentReady] = useState(false);
  const [downloadedPaths, setDownloadedPaths] = useState({});
  const swiperRefs = useRef({});
  const videoRefs = useRef({});
  const timerRefs = useRef({});

  const generateContentHash = (content) => {
    return JSON.stringify(content);
  };

  useEffect(() => {
    const content = data?.source[0]?.source?.content || {};
    setPlaylistContent(content);
    setIsLoading(true);
    setAllContentReady(false);
  }, [data]);

  useEffect(() => {
    if (Object.keys(playlistContent).length > 0) {
      checkPermissions().then(async (granted) => {
        if (granted) {
          const currentContentHash = generateContentHash(playlistContent);
          const savedContentHash = await AsyncStorage.getItem(CONTENT_HASH_KEY);

          if (currentContentHash !== savedContentHash) {
            await AsyncStorage.setItem(CONTENT_HASH_KEY, currentContentHash);
            const savedPaths = await loadDownloadedPaths();
            setDownloadedPaths(savedPaths);
            resetPlayer(savedPaths, true);
          } else {
            const savedPaths = await loadDownloadedPaths();
            setDownloadedPaths(savedPaths);
            resetPlayer(savedPaths, false);
          }
        } else {
          console.error("Storage permission not granted");
          setIsLoading(false);
        }
      });
    }
  }, [playlistContent]);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const readGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      const writeGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      if (!readGranted || !writeGranted) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        return (
          granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true;
    } else if (Platform.OS === 'ios') {
      const photoLibraryGranted = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      return photoLibraryGranted === RESULTS.GRANTED;
    }
    return false;
  };

  const loadDownloadedPaths = async () => {
    try {
      const savedPaths = await AsyncStorage.getItem(DOWNLOADED_PATHS_KEY);
      return savedPaths ? JSON.parse(savedPaths) : {};
    } catch (error) {
      console.error(`Failed to load downloaded paths: ${error.message}`);
      return {};
    }
  };

  const saveDownloadedPaths = async (paths) => {
    try {
      await AsyncStorage.setItem(DOWNLOADED_PATHS_KEY, JSON.stringify(paths));
    } catch (error) {
      console.error(`Failed to save downloaded paths: ${error.message}`);
    }
  };

  const clearOldFiles = async (paths) => {
    for (const key in paths) {
      if (paths.hasOwnProperty(key)) {
        for (const idx in paths[key]) {
          if (paths[key].hasOwnProperty(idx)) {
            try {
              await RNFS.unlink(paths[key][idx]);
            } catch (error) {
              console.error(`Failed to delete file: ${error.message}`);
            }
          }
        }
      }
    }
  };

  const downloadFile = async (url, filename) => {
    const downloadDest = `${RNFS.DocumentDirectoryPath}/${filename}`;
    try {
      const download = await RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadDest,
      }).promise;
      return download.statusCode === 200 ? downloadDest : null;
    } catch (error) {
      console.error(`Failed to download file: ${error.message}`);
      return null;
    }
  };

  const resetPlayer = useCallback(async (existingPaths, isNewContent) => {
    // Timer ve video referanslarını sıfırla
    Object.keys(timerRefs.current).forEach(key => {
      clearTimeout(timerRefs.current[key]);
    });
    timerRefs.current = {};

    Object.keys(videoRefs.current).forEach(key => {
      const videoRef = videoRefs.current[key];
      if (videoRef && videoRef.pause) {
        videoRef.pause();
      }
    });
    videoRefs.current = {};

    const initialVideoStates = {};
    const initialIndices = {};
    const downloadPromises = [];

    if (isNewContent) {
      await clearOldFiles(existingPaths);
    }

    for (const key in playlistContent) {
      if (playlistContent.hasOwnProperty(key)) {
        initialVideoStates[key] = playlistContent[key]?.playlist?.map(() => ({ paused: true }));
        initialIndices[key] = 0;

        playlistContent[key]?.playlist.forEach((item, idx) => {
          console.log(item)
          if (!isNewContent && existingPaths[key] && existingPaths[key][idx]) {
            return; // Dosya zaten indirilmiş, tekrar indirme
          }
          if (item.type === 'video') {
            const videoUrl = `https://vz-d99c6c4e-749.b-cdn.net/${item?.meta?.video_id}/original`;
            const filename = `${item?.meta?.video_id}`;
            downloadPromises.push(downloadFile(videoUrl, filename).then(localPath => ({ key, idx, type: 'video', localPath })));
          } else if (item.type === 'image') {
           
            const imageUrl = `https://${item?.domain}/${item?.path}/${item?.file}`;
            const filename = `${item?.file}`;

            downloadPromises.push(downloadFile(imageUrl, filename).then(localPath => ({ key, idx, type: 'image', localPath })));
          }
        });
      }
    }

    const downloadedFiles = await Promise.all(downloadPromises);

    const newDownloadedPaths = isNewContent ? {} : { ...existingPaths };
    downloadedFiles.forEach(file => {
      if (!newDownloadedPaths[file.key]) {
        newDownloadedPaths[file.key] = {};
      }
      newDownloadedPaths[file.key][file.idx] = file.localPath;
    });

    setDownloadedPaths(newDownloadedPaths);
    saveDownloadedPaths(newDownloadedPaths);
    setVideoStates(initialVideoStates);
    setCurrentIndices(initialIndices);
    setAllContentReady(true);
    setIsLoading(false);
    console.log('Player reset and content downloaded:', newDownloadedPaths);
  }, [playlistContent]);

  useEffect(() => {
    if (allContentReady) {
      for (const key in playlistContent) {
        if (playlistContent.hasOwnProperty(key) && playlistContent[key].playlist[0].type === 'video') {
          setVideoStates(prevStates => ({
            ...prevStates,
            [key]: prevStates[key].map((state, idx) => idx === 0 ? { ...state, paused: false } : state)
          }));
        }
      }
    }
  }, [allContentReady]);

  const handleSlideChange = useCallback((index, playlistIndex) => {
    console.log(`Slide changed to index ${index} in playlist ${playlistIndex}`);
    setCurrentIndices(prev => ({ ...prev, [playlistIndex]: index }));

    setVideoStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        newStates[key] = newStates[key].map((state, i) => ({
          ...state,
          paused: !(Number(key) === playlistIndex && i === index)
        }));
      });
      return newStates;
    });

    const currentMedia = playlistContent[playlistIndex]?.playlist[index];
    if (currentMedia?.type === 'video') {
      const videoRef = videoRefs.current[`${playlistIndex}-${index}`];
      if (videoRef) {
        videoRef.seek(0);
      }
    } else if (currentMedia?.type === 'image') {
      if (timerRefs.current[playlistIndex]) {
        clearTimeout(timerRefs.current[playlistIndex]);
      }
      timerRefs.current[playlistIndex] = setTimeout(() => {
        goToNextSlide(playlistIndex);
      }, currentMedia.meta?.duration * 1000 || DEFAULT_DURATION);
    }
  }, [playlistContent]);

  const goToNextSlide = useCallback((playlistIndex) => {
    const playlistLength = playlistContent[playlistIndex]?.playlist?.length || 0;
    console.log(`Playlist length for index ${playlistIndex}: ${playlistLength}`);
    if (playlistLength === 0) return;

    const currentIndex = currentIndices[playlistIndex] ?? 0;
    const nextIndex = (currentIndex + 1) % playlistLength;
    console.log(`Going to next slide: ${nextIndex} in playlist ${playlistIndex}`);

    if (swiperRefs.current[playlistIndex]) {
      if (nextIndex === 0) {
        swiperRefs.current[playlistIndex].scrollTo(nextIndex, false);
      } else {
        swiperRefs.current[playlistIndex].scrollTo(nextIndex, true);
      }
    }

    if (timerRefs.current[playlistIndex]) {
      clearTimeout(timerRefs.current[playlistIndex]);
    }

    timerRefs.current[playlistIndex] = setTimeout(() => {
      goToNextSlide(playlistIndex);
    }, playlistContent[playlistIndex]?.playlist[nextIndex]?.meta?.duration * 1000 || DEFAULT_DURATION);
  }, [playlistContent, currentIndices]);

  const renderMediaContent = useCallback((res, idx, index) => {
    const isVideo = res?.type === 'video';
    const localPath = downloadedPaths[index]?.[idx];
    const shouldRenderVideo = currentIndices[index] === idx;
    const shouldLoop = playlistContent[index]?.playlist?.length === 1 && isVideo;
    return (
      <View key={idx} style={styles.mediaContainer}>
        {res?.type === 'image' && (
          <Image
            style={styles.image}
            source={{ uri: `file://${localPath}` }}
            resizeMode={`${res.meta.objectFit}`}
            onLoad={() => {
              if (idx === currentIndices[index]) {
                if (timerRefs.current[index]) {
                  clearTimeout(timerRefs.current[index]);
                }
                timerRefs.current[index] = setTimeout(() => {
                  goToNextSlide(index);
                }, res.meta?.duration * 1000 || DEFAULT_DURATION);
              }
            }}
          />
        )}
        {res?.type === 'video' && shouldRenderVideo && (
          <Video
            ref={(ref) => {
              if (!videoRefs.current) {
                videoRefs.current = {};
              }
              videoRefs.current[`${index}-${idx}`] = ref;
            }}
            source={{ uri: `file://${localPath}` }}
            style={styles.video}
            muted={false}
            resizeMode={`${res.meta.objectFit}`}
            repeat={shouldLoop}
            paused={videoStates[index]?.[idx]?.paused}
            onLoad={() => {
              console.log(`Video ${index}-${idx} loaded`);
            }}
            onError={(error) => console.error(`Video error: ${error.errorString}`)}
            onEnd={() => {
              if (!shouldLoop) {
                console.log(`Video ${index}-${idx} ended`);
                goToNextSlide(index);
              }
            }}
          />
        )}
      </View>
    );
  }, [currentIndices, videoStates, playlistContent, downloadedPaths]);

  if (Object.keys(playlistContent).length === 0 || !allContentReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1e29f3" />
        <Text style={styles.loadingText}>İçerikler güncelleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.playerContainer}>
      <View style={styles.innerContainer}>
        {data?.source[0]?.source?.layout?.properties?.boxes &&
          data.source[0].source.layout.properties.boxes.map((resx, index) => {
            const playlist = playlistContent[index]?.playlist;
            return (
              <View key={index} style={styles.boxContainer}>
                {playlist && (
                  <Swiper
                    key={`${index}-${playlist.length}`}
                    ref={(el) => (swiperRefs.current[index] = el)}
                    autoplay={false}
                    loop={false}
                    showsPagination={false}
                    effect="slide"
                    onIndexChanged={(i) => handleSlideChange(i, index)}
                  >
                    {playlist.map((res, idx) => renderMediaContent(res, idx, index))}
                  </Swiper>
                )}
              </View>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: 'black'
  },
  innerContainer: {
    height: '100%',
    width: '100%',
  },
  boxContainer: {
    flex: 1,
  },
  mediaContainer: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    width: "100%",
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
});

export default Player;
