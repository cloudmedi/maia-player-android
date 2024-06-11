import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Swiper from 'react-native-swiper';
import { useSelector } from 'react-redux';
import Video from 'react-native-video';

function Player() {
  const data = useSelector((state) => state.user);
  const [playlistContent, setPlaylistContent] = useState({});
  const [slideDurations, setSlideDurations] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const swiperRefs = useRef({});
  const videoRefs = useRef({});

  useEffect(() => {
    const content = data?.source[0]?.source?.content || {};
    setPlaylistContent(content);
    console.log('Playlist Content:', content);
  }, [data]);

  useEffect(() => {
    const durations = {};
    for (const key in playlistContent) {
      if (playlistContent.hasOwnProperty(key)) {
        durations[key] = playlistContent[key]?.playlist?.map(item => item?.meta?.duration || 5000);
      }
    }
    setSlideDurations(durations);
    console.log('Slide Durations:', durations);
  }, [playlistContent]);

  const handleSlideChange = (index, playlistIndex) => {
    setCurrentIndex(index);
    setCurrentPlaylistIndex(playlistIndex);
  };

  const handleSlideChangeTransitionEnd = (index, playlistIndex) => {
    console.log(index)
    handleSlideChange(index, playlistIndex);
    const currentMedia = playlistContent[playlistIndex]?.playlist[index];
    if (currentMedia?.type === 'video') {
      const videoRef = videoRefs.current[`${playlistIndex}-${index}`];
      if (videoRef) {
        videoRef.seek(0);
      }
    }
  };

  if (Object.keys(slideDurations).length === 0) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View ref={swiperRefs} style={styles.playerContainer}>
      <View style={styles.innerContainer}>
        {data?.source[0]?.source?.layout?.properties?.boxes &&
          data.source[0].source.layout.properties.boxes.map((resx, index) => {
            const playlist = playlistContent[index]?.playlist;
            const duration = slideDurations[index]?.[0] / 1000 || 5;
            console.log('Duration for index', index, ':', duration);

            return (
              <View key={index} style={styles.boxContainer}>
                {playlist && (
                  <Swiper
                    key={`${index}-${playlist.length}`}
                    ref={(el) => (swiperRefs.current[index] = el)}
                    autoplay
                    autoplayTimeout={duration}
                    loop
                    onIndexChanged={(i) => handleSlideChangeTransitionEnd(i, index)}
                  >
                    {playlist.map((res, idx) => {
                      const isVideo = res?.type === 'video';
                      const imageUrl = !isVideo
                        ? `https://${res?.domain}/${res?.path}/${res?.file}`
                        : `https://vz-d99c6c4e-749.b-cdn.net/${res?.meta?.video_id}/preview.webp`;
                      console.log('Image URL:', imageUrl);

                      return (
                        <View key={idx} style={styles.mediaContainer}>
                          {res?.type === 'image' && (
                            <Image
                              style={styles.image}
                              source={{ uri: imageUrl }}
                            />
                          )}
                          {res?.type === 'video' && (
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
                              resizeMode="cover"
                              repeat={playlist.length === 1}
                            
                             
                            />
                          )}
                        </View>
                      );
                    })}
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
    resizeMode: 'cover',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});

export default Player;
