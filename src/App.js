import React, { useEffect, useRef, useState } from "react";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";
import "./App.css";

let ffmpeg; // Store the ffmpeg instance
function App() {
  const [videoDuration, setVideoDuration] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [videoSrc, setVideoSrc] = useState("");
  const [videoFileValue, setVideoFileValue] = useState("");
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [videoTrimmedUrl, setVideoTrimmedUrl] = useState("");
  const videoRef = useRef();
  let initialSliderValue = 0;

  // Created to load script by passing the required script and append in head tag
  const loadScript = (src) => {
    return new Promise((onFulfilled, _) => {
      const script = document.createElement("script");
      let loaded;
      script.async = "async";
      script.defer = "defer";
      script.setAttribute("src", src);
      script.onreadystatechange = script.onload = () => {
        if (!loaded) {
          onFulfilled(script);
        }
        loaded = true;
      };
      script.onerror = function () {
        console.log("Script failed to load");
      };
      document.getElementsByTagName("head")[0].appendChild(script);
    });
  };

  // Fetch file helper function
  const fetchFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle Upload of the video
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const blobURL = URL.createObjectURL(file);
    setVideoFileValue(file);
    setVideoSrc(blobURL);
  };

  // Convert the time obtained from the video to HH:MM:SS format
  const convertToHHMMSS = (val) => {
    const secNum = Math.floor(val);
    const milliseconds = Math.floor((val % 1) * 1000);
    let hours = Math.floor(secNum / 3600);
    let minutes = Math.floor((secNum - hours * 3600) / 60);
    let seconds = secNum - hours * 3600 - minutes * 60;

    if (hours < 10) {
      hours = "0" + hours;
    }
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    if (seconds < 10) {
      seconds = "0" + seconds;
    }

    // Format milliseconds with leading zeros
    let formattedMilliseconds = ("00" + milliseconds).slice(-3);

    let time;

    // Display hours, minutes, seconds, and milliseconds
    if (hours === "00") {
      time = minutes + ":" + seconds + "." + formattedMilliseconds;
    } else {
      time =
        hours + ":" + minutes + ":" + seconds + "." + formattedMilliseconds;
    }

    return time;
  };

  useEffect(() => {
    // Load the ffmpeg script
    loadScript(
      "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/ffmpeg.min.js"
    ).then(() => {
      if (typeof window !== "undefined") {
        // creates an ffmpeg instance.
        ffmpeg = window.FFmpeg.createFFmpeg({ log: true });
        // Load ffmpeg.wasm-core script
        ffmpeg.load();
        // Set true that the script is loaded
        setIsScriptLoaded(true);
      }
    });
  }, []);

  // Get the duration of the video using videoRef
  useEffect(() => {
    if (videoRef && videoRef.current) {
      const currentVideo = videoRef.current;
      currentVideo.onloadedmetadata = () => {
        setVideoDuration(currentVideo.duration);
        setEndTime(currentVideo.duration);
      };
    }
  }, [videoSrc]);

  // Called when the handle of the nouislider is being dragged
  const updateOnSliderChange = (values, handle) => {
    setVideoTrimmedUrl("");
    let readValue;
    if (handle) {
      readValue = values[handle] | 0;
      if (endTime !== readValue) {
        setEndTime(readValue);
      }
    } else {
      readValue = values[handle] | 0;
      if (initialSliderValue !== readValue) {
        initialSliderValue = readValue;
        if (videoRef && videoRef.current) {
          videoRef.current.currentTime = readValue;
          setStartTime(readValue);
        }
      }
    }
  };

  // Play the video when the button is clicked
  const handlePlay = () => {
    if (videoRef && videoRef.current) {
      videoRef.current.play();
    }
  };

  const handlePause = () => {
    if (videoRef && videoRef.current) {
      videoRef.current.pause();
    }
  };

  // Pause the video when the endTime matches the currentTime of the playing video
  const handlePauseVideo = (e) => {
    const currentTime = Math.floor(e.currentTarget.currentTime);

    if (currentTime === endTime) {
      e.currentTarget.pause();
    }
  };

  // Trim functionality of the video
  const handleTrim = async () => {
    if (isScriptLoaded) {
      const { name, type } = videoFileValue;
      // Write video to memory
      ffmpeg.FS(
        "writeFile",
        name,
        await fetchFile(videoFileValue) // Use fetchFile helper function
      );
      const videoFileType = type.split("/")[1];
      // Run the ffmpeg command to trim video
      await ffmpeg.run(
        "-i",
        name,
        "-ss",
        `${convertToHHMMSS(startTime)}`,
        "-to",
        `${convertToHHMMSS(endTime)}`,
        "-acodec",
        "copy",
        "-vcodec",
        "copy",
        `out.${videoFileType}`
      );
      // Convert data to url and store it in videoTrimmedUrl state
      const data = ffmpeg.FS("readFile", `out.${videoFileType}`);
      const url = URL.createObjectURL(
        new Blob([data.buffer], { type: videoFileValue.type })
      );
      setVideoTrimmedUrl(url);
    }
  };

  return (
    <div className="App">
      <input type="file" onChange={handleFileUpload} />
      <br />
      {videoSrc.length ? (
        <React.Fragment>
          <video
            src={videoSrc}
            ref={videoRef}
            onTimeUpdate={handlePauseVideo}
            height={480}
          >
            <source src={videoSrc} type={videoFileValue.type} />
          </video>
          <br />
          <Nouislider
            behaviour="tap-drag"
            step={1}
            margin={3}
            limit={30}
            range={{ min: 0, max: videoDuration || 2 }}
            start={[0, videoDuration || 2]}
            connect
            onUpdate={updateOnSliderChange}
          />
          <br />
          Start duration: {convertToHHMMSS(startTime)} &nbsp; End duration:{" "}
          {convertToHHMMSS(endTime)}
          <br />
          <button onClick={handlePlay}>Play</button> &nbsp;
          <button onClick={handlePause}>Pause</button> &nbsp;
          <button onClick={handleTrim}>Trim</button>
          <br />
          {videoTrimmedUrl && (
            <video controls height={480}>
              <source src={videoTrimmedUrl} type={videoFileValue.type} />
            </video>
          )}
        </React.Fragment>
      ) : (
        ""
      )}
    </div>
  );
}

export default App;
