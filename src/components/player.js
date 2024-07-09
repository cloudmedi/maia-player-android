import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-swiper';
import { useSelector } from 'react-redux';
import Video from 'react-native-video';

const DEFAULT_DURATION = 5000;

function Player() {
  const data = useSelector((state) => state.user);
  const [playlistContent, setPlaylistContent] = useState({});
  const [currentIndices, setCurrentIndices] = useState({});
  const [videoStates, setVideoStates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const swiperRefs = useRef({});
  const videoRefs = useRef({});
  const timerRefs = useRef({});

  useEffect(() => {
    const content = data?.source[0]?.source?.content || {};
    setPlaylistContent(content);
    console.log('Playlist Content:', content);
    setIsLoading(true);
  }, [data]);

  useEffect(() => {
    resetPlayer();
  }, [playlistContent]);

  const resetPlayer = useCallback(() => {
    // Tüm zamanlayıcıları temizle
    Object.keys(timerRefs.current).forEach(key => {
      clearTimeout(timerRefs.current[key]);
    });
    timerRefs.current = {};

    // Tüm video oynatıcıları durdur
    Object.keys(videoRefs.current).forEach(key => {
      const videoRef = videoRefs.current[key];
      if (videoRef && videoRef.pause) {
        videoRef.pause();
      }
    });
    videoRefs.current = {};

    // Başlangıç durumunu sıfırla
    const initialVideoStates = {};
    const initialIndices = {};
    for (const key in playlistContent) {
      if (playlistContent.hasOwnProperty(key)) {
        initialVideoStates[key] = playlistContent[key]?.playlist?.map(() => ({ paused: true }));
        initialIndices[key] = 0;
      }
    }
    setVideoStates(initialVideoStates);
    setCurrentIndices(initialIndices);

    if (Object.keys(playlistContent).length > 0) {
      Object.keys(playlistContent).forEach(index => {
        const firstBox = playlistContent[index];
        if (firstBox.playlist && firstBox.playlist[0]?.type === 'video') {
          setTimeout(() => {
            setVideoStates(prev => ({
              ...prev,
              [index]: [{ paused: false }, ...prev[index].slice(1)]
            }));
            setIsLoading(false);
          }, 100);
        } else if (firstBox.playlist && firstBox.playlist[0]?.type === 'image') {
          timerRefs.current[index] = setTimeout(() => {
            goToNextSlide(index);
            setIsLoading(false);
          }, firstBox.playlist[0]?.meta?.duration * 1000 || DEFAULT_DURATION);
        }
      });
    } else {
      setIsLoading(false);
    }
  }, [playlistContent]);

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
      swiperRefs.current[playlistIndex].scrollTo(nextIndex, true);
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
    const imageUrl = !isVideo
      ? `https://${res?.domain}/${res?.path}/${res?.file}`
      : `https://vz-d99c6c4e-749.b-cdn.net/${res?.meta?.video_id}/preview.webp`;

    const shouldRenderVideo = currentIndices[index] === idx;
    const shouldLoop = playlistContent[index]?.playlist?.length === 1 && isVideo;

    return (
      <View key={idx} style={styles.mediaContainer}>
        {res?.type === 'image' && (
          <Image
            style={styles.image}
            source={{ uri: imageUrl }}
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
            source={{ uri: `https://vz-d99c6c4e-749.b-cdn.net/${res?.meta.video_id}/original` }}
            style={styles.video}
            muted={false}
            resizeMode={`${res.meta.objectFit}`}
            repeat={shouldLoop}
            paused={videoStates[index]?.[idx]?.paused}
            onLoad={() => {
              console.log(`Video ${index}-${idx} loaded`);
              if (isLoading) setIsLoading(false); // Set loading to false when video is loaded
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
  }, [currentIndices, videoStates, playlistContent, isLoading]);

  if (Object.keys(playlistContent).length === 0 || isLoading) {
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
    width:"100%",
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
