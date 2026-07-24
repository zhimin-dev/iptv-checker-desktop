import React from 'react';
import videojs from 'video.js';
import '@videojs/http-streaming';
// import 'videojs-contrib-quality-levels';
import 'videojs-http-source-selector';
import 'video.js/dist/video-js.css';

export const VideoJS = (props) => {
  const videoRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const { options, onReady, headers } = props;

  React.useEffect(() => {

    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode. 
      const videoElement = document.createElement("video-js");
      // var playAndFullscreen = document.getElementsByClassName('play-and-fullscreen')[0];

      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      videojs.Vhs.xhr.onRequest = (options) => {
        if (!options.headers) {
          options.headers = {}
        }
        if (headers.length > 0) {
          for (let i = 0; i < headers.length; i++) {
            if (headers[i].key !== "" && headers[i].key !== 'User-Agent') {
              options.headers[headers[i].key] = headers[i].value
            }
          }
        }
      }

      const player = playerRef.current = videojs(videoElement, options, () => {
        videojs.log('player is ready');
        onReady && onReady(player);
      });
      if (typeof player.httpSourceSelector === "function" && player) {
        player.httpSourceSelector();
      }
    } else {
      const player = playerRef.current;
      if (typeof player.httpSourceSelector === "function" && player) {
        player.httpSourceSelector();
      }
      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options, videoRef]);

  // Dispose the Video.js player when the functional component unmounts
  React.useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
}

export default VideoJS;