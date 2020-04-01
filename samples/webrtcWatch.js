/*
  For node server use https://github.com/TannerGabriel/WebRTC-Video-Broadcast
  - run node server
  - open https://lyb-streaming.herokuapp.com/broadcast.html or http://localhost:3000/broadcast.html

  To deploy node.js project on Heroku watch this youtube video https://www.youtube.com/watch?v=MxfxiR8TVNU

  General Flow:
  - socket on connection
  - socket emit watcher
  - socket on offer
    + RTCPeerConnection
    + setRemoteDescription
    + createAnswer
    + setLocalDescription then emit answer
    + onaddstream
    + onicecandidate
*/

import React, {useState} from 'react';
import {View, TouchableOpacity, Text} from 'react-native';
import {RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCView} from 'react-native-webrtc';
import io from 'socket.io-client';

export default WebRTCWatch = _ => {  
  let peer, socket;
  let config = {
    iceServers: [
      {urls: 'stun:stun.services.mozilla.com'},
      {urls: 'stun:stun.l.google.com:19302'}
    ]
  };
   
  const [remoteStream, setRemoteStream] = useState();
 
  const watch = _ => {
    socket = io('https://lyb-streaming.herokuapp.com'); // http://192.168.xxx.xxx:3000 run cmd command ipconfig

    socket.on('connect', _ => {
      socket.emit('watcher'); 
    });

    socket.on('offer', async (id, desc) => {
      try {
        peer = new RTCPeerConnection(config);

        peer
          .setRemoteDescription(new RTCSessionDescription(desc))
          .then(_ => peer.createAnswer())
          .then(sdp => peer.setLocalDescription(sdp))
          .then(_ => { 
            socket.emit('answer', id, peer.localDescription); 
          });

        peer.onicecandidate = e => {
          if (e.candidate) {
            socket.emit('candidate', id, e.candidate);
          }
        }; 

        // onaddstream is equivalent to ontrack 
        peer.onaddstream = e => { 
          if (e.stream && remoteStream !== e.stream) {
            setRemoteStream(e.stream);
          }
        };  
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('candidate', (id, candidate) => {
      try {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.log('Error adding iceCandidate', err);
      }
    }); 
  };

  return (
    <View style={{flex: 1}}>
      <TouchableOpacity onPress={watch}><Text>Watch Live Streaming</Text></TouchableOpacity>
      {remoteStream && <RTCView style={{width: '100%', height: '100%'}} zIndex={0} streamURL={remoteStream.toURL()} />} 
    </View> 
  );
}