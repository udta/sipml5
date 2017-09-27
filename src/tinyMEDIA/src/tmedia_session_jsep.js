/*
* Copyright (C) 2012-2016 Doubango Telecom <http://www.doubango.org>
* License: BSD
* This file is part of Open Source sipML5 solution <http://www.sipml5.org>
*/
// http://tools.ietf.org/html/draft-uberti-rtcweb-jsep-02
// JSEP00: webkitPeerConnection00 (http://www.w3.org/TR/2012/WD-webrtc-20120209/)
// JSEP01: webkitRTCPeerConnection (http://www.w3.org/TR/webrtc/), https://webrtc-demos.appspot.com/html/pc1.html
// Mozilla: http://mozilla.github.com/webrtc-landing/pc_test.html
// Contraints: https://webrtc-demos.appspot.com/html/constraints-and-stats.html
// Android: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/b8538c85df801b40
// Canary 'muted': https://groups.google.com/group/discuss-webrtc/browse_thread/thread/8200f2049c4de29f
// Canary state events: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/bd30afc3e2f43f6d
// DTMF: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/1354781f202adbf9
// IceRestart: https://groups.google.com/group/discuss-webrtc/browse_thread/thread/c189584d380eaa97
// Video Resolution: https://code.google.com/p/chromium/issues/detail?id=143631#c9
// Webrtc-Everywhere: https://github.com/sarandogou/webrtc-everywhere
// Adapter.js: https://github.com/sarandogou/webrtc

tmedia_session_jsep.prototype = Object.create(tmedia_session.prototype);
tmedia_session_jsep01.prototype = Object.create(tmedia_session_jsep.prototype);

tmedia_session_jsep.prototype.o_pc = null;
tmedia_session_jsep.prototype.b_cache_stream = false;
tmedia_session_jsep.prototype.o_local_stream = null;
tmedia_session_jsep.prototype.o_sdp_jsep_lo = null;
tmedia_session_jsep.prototype.o_sdp_lo = null;
tmedia_session_jsep.prototype.b_sdp_lo_pending = false;
tmedia_session_jsep.prototype.o_sdp_json_ro = null;
tmedia_session_jsep.prototype.o_sdp_ro = null;
tmedia_session_jsep.prototype.b_sdp_ro_pending = false;
tmedia_session_jsep.prototype.b_sdp_ro_offer = false;
tmedia_session_jsep.prototype.s_answererSessionId = null;
tmedia_session_jsep.prototype.s_offererSessionId = null;
tmedia_session_jsep.prototype.ao_ice_servers = null;
tmedia_session_jsep.prototype.o_bandwidth = { audio: 64, video: 512 };
tmedia_session_jsep.prototype.o_video_size = { minWidth: undefined, minHeight: undefined, maxWidth: undefined, maxHeight: undefined };
tmedia_session_jsep.prototype.d_screencast_windowid = 0; // BFCP. #0 means entire desktop

tmedia_session_jsep.prototype.b_ro_changed = false;
tmedia_session_jsep.prototype.b_lo_held = false;
tmedia_session_jsep.prototype.b_ro_held = false;

//
//  JSEP
//

tmedia_session_jsep.prototype.CreateInstance = function (o_mgr) {
    return new tmedia_session_jsep01(o_mgr);
}

function tmedia_session_jsep(o_mgr) {
    tmedia_session.call(this, o_mgr.e_type, o_mgr);
}

tmedia_session_jsep.prototype.__set = function (o_param) {
    if (!o_param) {
        return -1;
    }
    switch (o_param.s_key) {
        case 'ice-servers':
            {
                this.ao_ice_servers = o_param.o_value;
                return 0;
            }
        case 'cache-stream':
            {
                this.b_cache_stream = !!o_param.o_value;
                return 0;
            }
        case 'bandwidth':
            {
                this.o_bandwidth = o_param.o_value;
                return 0;
            }
        case 'video-size':
            {
                this.o_video_size = o_param.o_value;
                return 0;
            }
        case 'screencast-windowid':
            {
                this.d_screencast_windowid = parseFloat(o_param.o_value.toString());
                if (this.o_pc && this.o_pc.setScreencastSrcWindowId) {
                    this.o_pc.setScreencastSrcWindowId(this.d_screencast_windowid);
                }
                return 0;
            }
        case 'mute-audio':
        case 'mute-video':
            {
                if (this.o_pc && typeof o_param.o_value == "boolean") {
                    if (this.o_pc.mute) {
                        this.o_pc.mute((o_param.s_key === 'mute-audio') ? "audio" : "video", o_param.o_value);
                    }
                    else if (this.o_local_stream) {
                        var tracks = (o_param.s_key === 'mute-audio') ? this.o_local_stream.getAudioTracks() : this.o_local_stream.getVideoTracks();
                        if (tracks) {
                            for (var i = 0; i < tracks.length; ++i) {
                                tracks[i].enabled = !o_param.o_value;
                            }
                        }
                    }
                }
            }
    }

    return -2;
}

tmedia_session_jsep.prototype.__prepare = function () {
    return 0;
}

tmedia_session_jsep.prototype.__set_media_type = function (e_type) {
    if (e_type != this.e_type) {
        this.e_type = e_type;
        this.o_sdp_lo = null;
    }
    return 0;
}

tmedia_session_jsep.prototype.__processContent = function (s_req_name, s_content_type, s_content_ptr, i_content_size) {
    if (this.o_pc && this.o_pc.processContent) {
        this.o_pc.processContent(s_req_name, s_content_type, s_content_ptr, i_content_size);
        return 0;
    }
    return -1;
}

tmedia_session_jsep.prototype.__send_dtmf = function (s_digit) {
    if (this.o_pc && this.o_pc.sendDTMF) {
        this.o_pc.sendDTMF(s_digit);
        return 0;
    }
    return -1;
}

tmedia_session_jsep.prototype.__start = function () {
    if (this.o_local_stream && this.o_local_stream.start) {
        // cached stream would be stopped in close()
        this.o_local_stream.start();
    }
    return 0;
}

tmedia_session_jsep.prototype.__pause = function () {
    if (this.o_local_stream && this.o_local_stream.pause) {
        this.o_local_stream.pause();
    }
    return 0;
}

tmedia_session_jsep.prototype.__stop = function () {
    this.close();
    this.o_sdp_lo = null;
    tsk_utils_log_info("PeerConnection::stop()");

    return 0;
}

tmedia_session_jsep.prototype.decorate_lo = function () {
    if (this.o_sdp_lo) {

        /* Session name for debugging - Requires by webrtc2sip to set RTCWeb type */
        var o_hdr_S;
        if ((o_hdr_S = this.o_sdp_lo.get_header(tsdp_header_type_e.S))) {
            o_hdr_S.s_value = "Doubango Telecom - " + tsk_utils_get_navigator_friendly_name();
        }
        /* HACK: https://bugzilla.mozilla.org/show_bug.cgi?id=1072384 */
        var o_hdr_O;
        if ((o_hdr_O = this.o_sdp_lo.get_header(tsdp_header_type_e.O))) {
            if (o_hdr_O.s_addr === "0.0.0.0") {
                o_hdr_O.s_addr = "127.0.0.1";
            }
        }

        /* Remove 'video' media if not enabled (bug in chrome: doesn't honor 'has_video' parameter) */
        if (!(this.e_type.i_id & tmedia_type_e.VIDEO.i_id)) {
            this.o_sdp_lo.remove_media("video");
        }
  
        /* Use OPUS by default */
        var o_hdr_M_audio = this.o_sdp_lo.get_header_m_by_name("audio");
        if ( o_hdr_M_audio ) {
             /* 这里判断是否优先使用h264 */
             //var o_encoder = localStorage.getItem("test_encoder_priority");
             tsk_utils_log_warn('Selected audio Codec is : window.audioCodec');
             var pt = o_hdr_M_audio.have_encoder("opus");
                      //o_hdr_M_audio.move_encoder(pt);
                 pt = o_hdr_M_audio.have_encoder("ISAC");
                      o_hdr_M_audio.move_encoder(pt);
                 pt = o_hdr_M_audio.have_encoder("ISAC");
                      o_hdr_M_audio.move_encoder(pt);

            /*Removed the RTCP a line*/
            o_hdr_M_audio.move_sdp_a("rtcp");

            pt = o_hdr_M_audio.have_encoder(window.audioCodec);
            if (pt) {
                //Remove the PT first
                o_hdr_M_audio.as_fmt.splice(o_hdr_M_audio.as_fmt.indexOf(pt),1);
                //Then add it to the first index
                o_hdr_M_audio.as_fmt.splice(0,0,pt);
            }
        }     


        var o_hdr_M_video = this.o_sdp_lo.get_header_m_by_name("video");

        if ( o_hdr_M_video ) {
        /* 这里判断是否优先使用h264 */
        //var o_encoder = localStorage.getItem("test_encoder_priority");
        tsk_utils_log_warn('Selected video Codec is : ' + window.videoCodec);
        if( window.videoCodec == 'h264')
        {
                    var pt = o_hdr_M_video.have_encoder("VP8");
                        o_hdr_M_video.move_encoder(pt);
                            pt = o_hdr_M_video.have_encoder("VP9");
                                o_hdr_M_video.move_encoder(pt);
        }
        else if ( window.videoCodec == 'vp8' )
        {
                    var pt = o_hdr_M_video.have_encoder("H264");
                        o_hdr_M_video.move_encoder(pt);
                            pt = o_hdr_M_video.have_encoder("VP9");
                                o_hdr_M_video.move_encoder(pt);
        }
        else
        {
                    var pt = o_hdr_M_video.have_encoder("H264");
                        o_hdr_M_video.move_encoder(pt);
                            pt = o_hdr_M_video.have_encoder("VP8");
                                o_hdr_M_video.move_encoder(pt);
        }

        /*Removed the RTCP a line*/
        o_hdr_M_video.move_sdp_a("rtcp");

      }

        /* RZHANG FOR  RTX / RED / ULPFEC testing ========= START */
        if ( window.mediaMode && o_hdr_M_video ) {
           var array = window.mediaMode.split('-');
           var i = 0;
           while ( i < array.length ) {
             //if(tsk_utils_get_navigator_friendly_name() === 'chrome')
             //{
                 tsk_utils_log_warn('Remove media a line: ' + array[i]);    
                 o_hdr_M_video.move_sdp_a(array[i]);
             //}

             i++;
          }
          
       }
       /*
        if ( o_hdr_M_video ) {
            // 这里判断是否优先使用h264 
            //var o_encoder = localStorage.getItem("test_encoder_priority");
            
            
            tsk_utils_log_warn('Selected video Codec is : ' + window.videoCodec);
            if( window.videoCodec == 'h264')
            {
                var pt = o_hdr_M_video.have_encoder("VP8");
                o_hdr_M_video.move_encoder(pt);
                pt = o_hdr_M_video.have_encoder("VP9");
                o_hdr_M_video.move_encoder(pt);
            } 
            else if ( window.videoCodec == 'vp8' )
            {
                var pt = o_hdr_M_video.have_encoder("H264");
                o_hdr_M_video.move_encoder(pt);
                pt = o_hdr_M_video.have_encoder("VP9");
                o_hdr_M_video.move_encoder(pt);
            }
            else
            { 
                var pt = o_hdr_M_video.have_encoder("H264");
                o_hdr_M_video.move_encoder(pt);
                pt = o_hdr_M_video.have_encoder("VP8");
                o_hdr_M_video.move_encoder(pt);
            }        
       }
       */

        /* RZHANG FOR  RTX / RED / ULPFEC testing ========= END   */
        

        /* hold / resume, profile, bandwidth... */
        var i_index = 0;
        var o_hdr_M;
        var b_fingerprint = !!this.o_sdp_lo.get_header_a("fingerprint"); // session-level fingerprint
        while ((o_hdr_M = this.o_sdp_lo.get_header_at(tsdp_header_type_e.M, i_index++))) {
            // hold/resume
            o_hdr_M.set_holdresume_att(this.b_lo_held, this.b_ro_held);

            // HACK: Nightly 20.0a1 uses RTP/SAVPF for DTLS-SRTP which is not correct. More info at https://bugzilla.mozilla.org/show_bug.cgi?id=827932.
            if (o_hdr_M.find_a("crypto")) {
                o_hdr_M.s_proto = "RTP/SAVPF";
            }
            else if (b_fingerprint || o_hdr_M.find_a("fingerprint")) {
                o_hdr_M.s_proto = "UDP/TLS/RTP/SAVPF";
            }

            // HACK: https://bugzilla.mozilla.org/show_bug.cgi?id=1072384
            if (o_hdr_M.o_hdr_C && o_hdr_M.o_hdr_C.s_addr === "0.0.0.0") {
                o_hdr_M.o_hdr_C.s_addr = "127.0.0.1";
            }

            /*// bandwidth
            if (this.o_bandwidth) {

                tsk_utils_log_warn( 'Set the B line: ' + this.o_bandwidth );
                if ( tsk_utils_get_navigator_friendly_name() === 'firefox' ) {    
                    if (this.o_bandwidth.audio && o_hdr_M.s_media.toLowerCase() == "audio") {
                        o_hdr_M.add_header(new tsdp_header_B("TIAS:" + this.o_bandwidth.audio));
                    }
                    else if (this.o_bandwidth.video && o_hdr_M.s_media.toLowerCase() == "video") {
                        o_hdr_M.add_header(new tsdp_header_B("TIAS:" + this.o_bandwidth.video));
                    }
                } else {
                    if (this.o_bandwidth.audio && o_hdr_M.s_media.toLowerCase() == "audio") {
                        o_hdr_M.add_header(new tsdp_header_B("AS:" + this.o_bandwidth.audio));
                    }
                    else if (this.o_bandwidth.video && o_hdr_M.s_media.toLowerCase() == "video") {
                        o_hdr_M.add_header(new tsdp_header_B("AS:" + this.o_bandwidth.video));
                    }
                }        
            }*/
        }
    }
    return 0;
}

tmedia_session_jsep.prototype.decorate_ro = function (b_remove_bundle) {
    if (this.o_sdp_ro) {
        var o_hdr_M, o_hdr_A;
        var i_index = 0, i;

        // FIXME: Chrome fails to parse SDP with global SDP "a=" attributes
        // Chrome 21.0.1154.0+ generate "a=group:BUNDLE audio video" but cannot parse it
        // In fact, new the attribute is left the ice callback is called twice and the 2nd one trigger new INVITE then 200OK. The SYN_ERR is caused by the SDP in the 200 OK.
        // Is it because of "a=rtcp:1 IN IP4 0.0.0.0"?
        if (b_remove_bundle) {
            this.o_sdp_ro.remove_header(tsdp_header_type_e.A);
        }

        // ==== START: RFC5939 utility functions ==== //
        var rfc5939_get_acap_part = function (o_hdr_a, i_part/* i_part = 1: field, 2: value*/) {
            var ao_match = o_hdr_a.s_value.match(/^\d\s+(\w+):([\D|\d]+)/i);
            if (ao_match && ao_match.length == 3) {
                return ao_match[i_part];
            }
        }
        var rfc5939_acap_ensure = function (o_hdr_a) {
            if (o_hdr_a && o_hdr_a.s_field == "acap") {
                o_hdr_a.s_field = rfc5939_get_acap_part(o_hdr_a, 1);
                o_hdr_a.s_value = rfc5939_get_acap_part(o_hdr_a, 2);
            }
        }
        var rfc5939_get_headerA_at = function (o_msg, s_media, s_field, i_index) {
            var i_pos = 0;
            var get_headerA_at = function (o_sdp, s_field, i_index) {
                if (o_sdp) {
                    var ao_headersA = (o_sdp.ao_headers || o_sdp.ao_hdr_A);
                    for (var i = 0; i < ao_headersA.length; ++i) {
                        if (ao_headersA[i].e_type == tsdp_header_type_e.A && ao_headersA[i].s_value) {
                            var b_found = (ao_headersA[i].s_field === s_field);
                            if (!b_found && ao_headersA[i].s_field == "acap") {
                                b_found = (rfc5939_get_acap_part(ao_headersA[i], 1) == s_field);
                            }
                            if (b_found && i_pos++ >= i_index) {
                                return ao_headersA[i];
                            }
                        }
                    }
                }
            }

            var o_hdr_a = get_headerA_at(o_msg, s_field, i_index); // find at session level
            if (!o_hdr_a) {
                return get_headerA_at(o_msg.get_header_m_by_name(s_media), s_field, i_index); // find at media level
            }
            return o_hdr_a;
        }


        var o_hdr_M_video = this.o_sdp_ro.get_header_m_by_name("video");

        if( o_hdr_M_video )
        {
            o_hdr_M_video.set_start_bitrate(); 
        }

        // ==== END: RFC5939 utility functions ==== //

        // change profile if not secure
        //!\ firefox nighly: DTLS-SRTP only, chrome: SDES-SRTP
        var b_fingerprint = !!this.o_sdp_ro.get_header_a("fingerprint"); // session-level fingerprint
        while ((o_hdr_M = this.o_sdp_ro.get_header_at(tsdp_header_type_e.M, i_index++))) {
            // check for "crypto:"/"fingerprint:" lines (event if it's not valid to provide "crypto" lines in non-secure SDP many clients do it, so, just check)
            if (o_hdr_M.s_proto.indexOf("SAVP") < 0) {
                if (o_hdr_M.find_a("crypto")) {
                    o_hdr_M.s_proto = "RTP/SAVPF";
                    break;
                }
                else if (b_fingerprint || o_hdr_M.find_a("fingerprint")) {
                    o_hdr_M.s_proto = "UDP/TLS/RTP/SAVPF";
                    break;
                }
            }

            // rfc5939: "acap:fingerprint,setup,connection"
            if (o_hdr_M.s_proto.indexOf("SAVP") < 0) {
                if ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "fingerprint", 0))) {
                    rfc5939_acap_ensure(o_hdr_A);
                    if ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "setup", 0))) {
                        rfc5939_acap_ensure(o_hdr_A);
                    }
                    if ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "connection", 0))) {
                        rfc5939_acap_ensure(o_hdr_A);
                    }
                    o_hdr_M.s_proto = "UDP/TLS/RTP/SAVP";
                }
            }
            // rfc5939: "acap:crypto". Only if DTLS is OFF
            if (o_hdr_M.s_proto.indexOf("SAVP") < 0) {
                i = 0;
                while ((o_hdr_A = rfc5939_get_headerA_at(this.o_sdp_ro, o_hdr_M.s_media, "crypto", i++))) {
                    rfc5939_acap_ensure(o_hdr_A);
                    o_hdr_M.s_proto = "RTP/SAVPF";
                    // do not break => find next "acap:crypto" lines and ensure them
                }
            }

            // HACK: Nightly 20.0a1 uses RTP/SAVPF for DTLS-SRTP which is not correct. More info at https://bugzilla.mozilla.org/show_bug.cgi?id=827932
            // Same for chrome: https://code.google.com/p/sipml5/issues/detail?id=92
            if (o_hdr_M.s_proto.indexOf("UDP/TLS/RTP/SAVP") != -1) {
                o_hdr_M.s_proto = "RTP/SAVPF";
            }
        }
    }
    return 0;
}

/*StreamStatistics ================================================Start*/
function MyRTCStreamStatistics() {
    var self = this;

    self.lastPackets = 0;
    self.lastLost = 0;
    self.lastBytes = 0;
    self.lastTimestamp = null;
    self.pctLost = [];
    self.info = {};
}

MyRTCStreamStatistics.prototype.getStats = function() {
    var self = this;
    return self.info;
};

MyRTCStreamStatistics.prototype.updateBWEStats = function(result) {
    var self = this;
    self.info['configuredBitrate'] = (result.stat('googTargetEncBitrate') / 1000).toFixed(1) + 'kbps';
};

MyRTCStreamStatistics.prototype.updatePacketLossStats = function(currentTotal, currentLost) {
    var self = this;
    var lostNow = currentLost - self.lastLost;
    var packetsNow = currentTotal - self.lastPackets;
    self.pctLost.push((lostNow * 100) / packetsNow);
    if (self.pctLost.length > 24) self.pctLost.splice(0, 1);
    var pctAverage = self.pctLost.reduce(function(a, b) { return a + b; }, 0);
    if (self.pctLost.length == 0) {
        self.info['percentageLost'] = '0%';
    } else {
        self.info['percentageLost'] = (pctAverage / self.pctLost.length).toFixed(1) + '%';
    }
};

MyRTCStreamStatistics.prototype.updateRxStats = function(result) {
    var self = this;

    if (!result) {
        return;
    }

    if ( result.stat != undefined ) {
        self.info['packetsReceived'] = result.stat('packetsReceived');
        self.info['packetsLost'] = result.stat('packetsLost');
        self.info['percentageLost'] = 0;
        self.info['bitrate'] = "unavailable";

        if (self.lastTimestamp > 0) {
            self.updatePacketLossStats(self.info['packetsReceived'], self.info['packetsLost']);
            var kbps = Math.round((result.stat('bytesReceived') - self.lastBytes) * 8 / (result.timestamp - self.lastTimestamp));
            self.info['bitrate'] = kbps + 'kbps';
        }

        if (result.stat('googFrameHeightReceived'))
            self.info['resolution'] = result.stat('googFrameWidthReceived') + 'x' + result.stat('googFrameHeightReceived');
        
        if (result.stat('googFrameRateReceived'))
            self.info['framerate'] = result.stat('googFrameRateReceived');

        if (result.stat('googDecodeMs'))
            self.info['decodeDelay'] = result.stat('googDecodeMs') + 'ms';

        self.lastTimestamp = result.timestamp;
        self.lastBytes = result.stat('bytesReceived');
        self.lastPackets = self.info['packetsReceived'];
        self.lastLost = self.info['packetsLost'];
    } else {
        self.info['packetsReceived'] = result.packetsReceived;
        self.info['packetsLost'] = result.packetsLost;
        self.info['percentageLost'] = 0;
        self.info['bitrate'] = "unavailable";

        if (self.lastTimestamp > 0) {
            self.updatePacketLossStats(self.info['packetsReceived'], self.info['packetsLost']);
            var kbps = Math.round((result.bytesReceived - self.lastBytes) * 8 / (result.timestamp - self.lastTimestamp));
            self.info['bitrate'] = kbps + 'kbps';
        }

        //if (result.stat('googFrameHeightReceived'))
        //    self.info['resolution'] = result.stat('googFrameWidthReceived') + 'x' + result.stat('googFrameHeightReceived');

        //if (result.stat('googDecodeMs'))
        //    self.info['decodeDelay'] = result.stat('googDecodeMs') + 'ms';

        self.lastTimestamp = result.timestamp;
        self.lastBytes = result.bytesReceived;
        self.lastPackets = self.info['packetsReceived'];
        self.lastLost = self.info['packetsLost'];
        
    }
};

MyRTCStreamStatistics.prototype.updateTxStats = function(result) {
    var self = this;

    if (!result) {
        return;
    }

    if ( result.stat != undefined ) {
        self.info['packetsSent'] = result.stat('packetsSent');
        self.info['packetsLost'] = result.stat('packetsLost');
        self.info['percentageLost'] = 0;
        self.info['bitrate'] = "unavailable";

        if (self.lastTimestamp > 0) {
            self.updatePacketLossStats(self.info['packetsSent'], self.info['packetsLost']);
            var kbps = Math.round((result.stat('bytesSent') - self.lastBytes) * 8 / (result.timestamp - self.lastTimestamp));
            self.info['bitrate'] = kbps + 'kbps';
        }

        if (result.stat('googFrameHeightSent'))
            self.info['resolution'] = result.stat('googFrameWidthSent') + 'x' + result.stat('googFrameHeightSent');

        if (result.stat('googFrameRateSent'))
            self.info['framerate'] = result.stat('googFrameRateSent');    

        self.lastTimestamp = result.timestamp;
        self.lastBytes = result.stat('bytesSent');
        self.lastPackets = self.info['packetsSent'];
        self.lastLost = self.info['packetsLost'];
    } else {
        self.info['packetsSent'] = result.packetsReceived;
        self.info['packetsLost'] = result.packetsLost;
        self.info['percentageLost'] = 0;
        self.info['bitrate'] = "unavailable";

        if (self.lastTimestamp > 0) {
            self.updatePacketLossStats(self.info['packetsSent'], self.info['packetsLost']);
            var kbps = Math.round((result.bytesReceived - self.lastBytes) * 8 / (result.timestamp - self.lastTimestamp));
            self.info['bitrate'] = kbps + 'kbps';
        }

        //if (result.stat('googFrameHeightSent'))
        //    self.info['resolution'] = result.stat('googFrameWidthSent') + 'x' + result.stat('googFrameHeightSent');

        self.lastTimestamp = result.timestamp;
        self.lastBytes = result.bytesReceived;
        self.lastPackets = self.info['packetsSent'];
        self.lastLost = self.info['packetsLost'];

    }
};

function MyRTCStatistics() {
    var self = this;

    self.audio_out = new MyRTCStreamStatistics();
    self.audio_in = new MyRTCStreamStatistics();
    self.video_out = new MyRTCStreamStatistics();
    self.video_in = new MyRTCStreamStatistics();
}

MyRTCStatistics.prototype.updateStats = function(results) {
    var self = this;

    if (results.length != undefined) {
        for (var i = 0; i < results.length; ++i) {
            if (self.statIsOfType(results[i], 'audio', 'send')) 
                self.audio_out.updateTxStats(results[i]);
            else if (self.statIsOfType(results[i], 'audio', 'recv')) 
                self.audio_in.updateRxStats(results[i]);
            else if (self.statIsOfType(results[i], 'video', 'send')) 
                self.video_out.updateTxStats(results[i]);
            else if (self.statIsOfType(results[i], 'video', 'recv')) 
                self.video_in.updateRxStats(results[i]);
            else if (self.statIsBandwidthEstimation(results[i])) 
                self.video_out.updateBWEStats(results[i]);
        }
    } else if (results.size != undefined ) {
        /*results is a MAP created by adapter.js*/        
          self.audio_out.updateTxStats(results.outbound_rtcp_audio_0);
          self.audio_in.updateRxStats(results.inbound_rtp_audio_0);
          self.video_out.updateTxStats(results.outbound_rtcp_video_1);
          self.video_in.updateRxStats(results.inbound_rtp_video_1);
    }
};

MyRTCStatistics.prototype.statIsBandwidthEstimation = function(result) {
    return result.type == 'VideoBwe';
};

MyRTCStatistics.prototype.statIsOfType = function(result, type, direction) {
    var self = this;

    mediaType = result.stat('mediaType');
    if (mediaType != undefined) {
        return result.type == 'ssrc' && mediaType == type && result.id.search(direction) != -1;
    } else {
        tId = result.stat('transportId');
        return result.type == 'ssrc' && tId && tId.search(type) != -1 && result.id.search(direction) != -1;
    }
};

MyRTCStatistics.prototype.getStats = function() {
    var self = this;
    //if (navigator.mozGetUserMedia) {
    //    return {};
    //}
    if (self.audio_in.lastTimestamp == null) {
        return {};
    }
    return {'outgoing': {'audio': self.audio_out.getStats(),
                         'video': self.video_out.getStats()},
            'incoming': {'audio': self.audio_in.getStats(),
                         'video': self.video_in.getStats()}};
};
/*StreamStatistics ================================================End*/

function myGetStats(peer, callback) {
    if (!!navigator.mozGetUserMedia) {
        /*Firefox */
        peer.getStats(null,
            function (rawStats) {
                o_stats.updateStats(rawStats);
                callback();
            },
            callback
        );
    } else {
        /*Chrome*/
        peer.getStats(function (rawStats) {
            o_stats.updateStats(rawStats.result());
        });
        callback();
    }
};
/*
function myGetStats(peer, callback) {
    if ( peer.getStats ) {
        //Mapped Stats 
        peer.getStats(null,
            function (res) {
                var items = [];
                res.forEach(function (result) {
                    items.push(result);
                });
                callback(items);
            },
            callback
        );
    } else {
        return;

        //Original Stats
        peer.getStats(function (res) {
            var items = [];
            res.result().forEach(function (result) {
                var item = {};
                result.names().forEach(function (name) {
                    item[name] = result.stat(name);
                });
                item.id = result.id;
                item.type = result.type;
                item.timestamp = result.timestamp;
                items.push(item);
            });
            callback(items);
        });
    }
};
*/
function getStats(peer) {


        //return;
    myGetStats(peer, function (results) {
    
        //console.error("========================================================================================================");
        //for (var i = 0; i < results.length; ++i) {
        //    var res = results[i];
        //    console.log(res);
        //}
        var res = o_stats.getStats();
        if (res != undefined && res.outgoing != undefined) {

            /*    
            console.error("Audio:")
            console.error("     outgoing:")
            console.error("bitrate: "+res.outgoing.audio.bitrate);
            console.error("packetsLost: "+res.outgoing.audio.packetsLost);
            console.error("packetsSent: "+res.outgoing.audio.packetsSent);
            console.error("percentageLost: "+res.outgoing.audio.percentageLost);
            console.error("     incoming:")
            console.error("bitrate: "+res.incoming.audio.bitrate);
            console.error("packetsLost: "+res.incoming.audio.packetsLost);
            console.error("packetsReceived: "+res.incoming.audio.packetsReceived);
            console.error("percentageLost: "+res.incoming.audio.percentageLost);

            console.error("Video:")
            console.error("     outgoing:")
            console.error("bitrate: "+res.outgoing.video.bitrate);
            console.error("configuredBitrate: "+res.outgoing.video.configuredBitrate);
            console.error("packetsLost: "+res.outgoing.video.packetsLost);
            console.error("packetsSent: "+res.outgoing.video.packetsSent);
            console.error("percentageLost: "+res.outgoing.video.percentageLost);
            console.error("resolution: "+res.outgoing.video.resolution);
            window.localResolution = res.outgoing.video.resolution;

            console.error("     incoming:")
            console.error("bitrate: "+res.incoming.video.bitrate);
            console.error("configuredBitrate: "+res.incoming.video.configuredBitrate);
            console.error("packetsLost: "+res.incoming.video.packetsLost);
            console.error("packetsRecevied: "+res.incoming.video.packetsReceived);
            console.error("percentageLost: "+res.incoming.video.percentageLost);
            console.error("resolution: "+res.incoming.video.resolution);
            window.remoteResolution = res.incoming.video.resolution;
            */
            $("#audioOutBitrate").text(res.outgoing.audio.bitrate);
            $("#audioOutPacketsLost").text(res.outgoing.audio.packetsLost);
            $("#audioOutPacketsSent").text(res.outgoing.audio.packetsSent);
            $("#audioOutPercentageLost").text(res.outgoing.audio.percentageLost);

            $("#audioInBitrate").text(res.incoming.audio.bitrate);
            $("#audioInPacketsLost").text(res.incoming.audio.packetsLost);
            $("#audioInPacketsReceived").text(res.incoming.audio.packetsReceived);
            $("#audioInPercentageLost").text(res.incoming.audio.percentageLost);

            $("#videoOutBitrate").text(res.outgoing.video.bitrate);
            $("#videoOutPacketsLost").text(res.outgoing.video.packetsLost);
            $("#videoOutPacketsSent").text(res.outgoing.video.packetsSent);
            $("#videoOutPercentageLost").text(res.outgoing.video.percentageLost);
             //$("#videoOutReso").text(res.outgoing.video.resolution);           
            window.localResolution = res.outgoing.video.resolution;
            window.localFramerate = res.outgoing.video.framerate;

            $("#videoInBitrate").text(res.incoming.video.bitrate);
            $("#videoInPacketsLost").text(res.incoming.video.packetsLost);
            $("#videoInPacketsReceived").text(res.incoming.video.packetsReceived);
            $("#videoInPercentageLost").text(res.incoming.video.percentageLost);
            window.remoteResolution = res.incoming.video.resolution;
            window.remoteFramerate = res.incoming.video.framerate;
        }

        if (window.stopStats == true) {
            return;
        } 
        
        //setTimeout(function () {
        //    getStats(peer);
        //}, 10000);

    });
}
var o_stats = undefined;
tmedia_session_jsep.prototype.subscribe_stream_events = function () {
    if (this.o_pc) {
        var This = (tmedia_session_jsep01.mozThis || this);
        this.o_pc.onaddstream = function (evt) {
            tsk_utils_log_info("__on_add_stream");
            This.o_remote_stream = evt.stream;
            if (This.o_mgr) {
                This.o_mgr.set_stream_remote(evt.stream);
            }
            o_stats = new MyRTCStatistics();
            //getStats(This.o_pc);
            if ( window.statsInt != undefined )
            { 
                window.clearInterval(window.statsInt);
            }        
            window.statsInt = window.setInterval(function() { getStats(This.o_pc)}, 5000);

        }
        this.o_pc.onremovestream = function (evt) {
            tsk_utils_log_info("__on_remove_stream");
            This.o_remote_stream = null;
            if (This.o_mgr) {
                This.o_mgr.set_stream_remote(null);
            }
        }
    }
}

tmedia_session_jsep.prototype.close = function () {
    if (this.o_mgr) { // 'onremovestream' not always called
        this.o_mgr.set_stream_remote(null);
        this.o_mgr.set_stream_local(null);
    }
    if (this.o_pc) {
        if (this.o_local_stream) {
            if ( tsk_utils_get_navigator_friendly_name() === 'chrome' ) {    
                // TODO: On Firefox 26: Error: "removeStream not implemented yet"
                try { this.o_pc.removeStream(this.o_local_stream); } catch (e) { tsk_utils_log_error(e); }
            }    
            if (!this.b_cache_stream || (this.e_type == tmedia_type_e.SCREEN_SHARE)) { // only stop if caching is disabled or screenshare
                try {
                    var tracks = this.o_local_stream.getTracks();
                    for (var track in tracks) {
                        tracks[track].stop();
                    }
                } catch (e) { tsk_utils_log_error(e); }
                try { this.o_local_stream.stop(); } catch (e) { } // Deprecated in Chrome 45: https://github.com/DoubangoTelecom/sipml5/issues/231
            }
            this.o_local_stream = null;
        }
        this.o_pc.close();
        this.o_pc = null;
        this.b_sdp_lo_pending = false;
        this.b_sdp_ro_pending = false;
    }
}

tmedia_session_jsep.prototype.__acked = function () {
    return 0;
}

tmedia_session_jsep.prototype.__hold = function () {
    if (this.b_lo_held) {
        // tsk_utils_log_warn('already on hold');
        return;
    }
    this.b_lo_held = true;

    this.o_sdp_ro = null;
    this.o_sdp_lo = null;

    if (this.o_pc && this.o_local_stream && tsk_utils_get_navigator_friendly_name() === 'chrome' ) {
        this.o_pc.removeStream(this.o_local_stream);
    }

    return 0;
}

tmedia_session_jsep.prototype.__resume = function () {
    if (!this.b_lo_held) {
        // tsk_utils_log_warn('not on hold');
        return;
    }
    this.b_lo_held = false;

    this.o_sdp_lo = null;
    this.o_sdp_ro = null;

    if (this.o_pc && this.o_local_stream) {
        this.o_pc.addStream(this.o_local_stream);
    }

    return 0;
}

//
//  JSEP01
//

function tmedia_session_jsep01(o_mgr) {
    tmedia_session_jsep.call(this, o_mgr);
    this.o_media_constraints =
    {
        'mandatory':
          {
              'OfferToReceiveAudio': !!(this.e_type.i_id & tmedia_type_e.AUDIO.i_id),
              'OfferToReceiveVideo': !!(this.e_type.i_id & tmedia_type_e.VIDEO.i_id)
          }
    };

    if (tsk_utils_get_navigator_friendly_name() == 'firefox') {
        tmedia_session_jsep01.mozThis = this; // FIXME: no longer needed? At least not needed on FF 34.05
        this.o_media_constraints.mandatory.MozDontOfferDataChannel = true;
    }
}

tmedia_session_jsep01.mozThis = undefined;

tmedia_session_jsep01.onGetUserMediaSuccess = function (o_stream, _This) {
    tsk_utils_log_info("onGetUserMediaSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc && This.o_mgr) {
        if (!This.b_sdp_lo_pending) {
            tsk_utils_log_warn("onGetUserMediaSuccess but no local sdp request is pending");
            return;
        }

        if (o_stream) {
            // save stream other next calls
            if (o_stream.getAudioTracks().length > 0 && o_stream.getVideoTracks().length == 0) {
                __o_jsep_stream_audio = o_stream;
            }
            else if (o_stream.getAudioTracks().length > 0 && o_stream.getVideoTracks().length > 0) {
                __o_jsep_stream_audiovideo = o_stream;
            }

            if (!This.o_local_stream) {
                This.o_mgr.callback(tmedia_session_events_e.STREAM_LOCAL_ACCEPTED, this.e_type);
            }

            // HACK: Firefox only allows to call gum one time
            if (tmedia_session_jsep01.mozThis) {
                __o_jsep_stream_audiovideo = __o_jsep_stream_audio = o_stream;
            }

            This.o_local_stream = o_stream;
            This.o_pc.addStream(o_stream);
        }
        else {
            // Probably call held
        }
        This.o_mgr.set_stream_local(o_stream);

        var b_answer = ((This.b_sdp_ro_pending || This.b_sdp_ro_offer) && (This.o_sdp_ro != null));
        if (b_answer) {
            tsk_utils_log_info("createAnswer");
            This.o_pc.createAnswer(
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpSuccess : function (o_offer) { tmedia_session_jsep01.onCreateSdpSuccess(o_offer, This); },
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpError : function (s_error) { tmedia_session_jsep01.onCreateSdpError(s_error, This); }//,
                //This.o_media_constraints,
                //false // createProvisionalAnswer
             );
        }
        else {
            tsk_utils_log_info("createOffer");
            This.o_pc.createOffer(
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpSuccess : function (o_offer) { tmedia_session_jsep01.onCreateSdpSuccess(o_offer, This); },
                tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onCreateSdpError : function (s_error) { tmedia_session_jsep01.onCreateSdpError(s_error, This); },
                This.o_media_constraints
            );
        }
    }
}

tmedia_session_jsep01.onGetUserMediaError = function (s_error, _This) {
    tsk_utils_log_info("onGetUserMediaError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_mgr) {
        tsk_utils_log_error(s_error);
        This.o_mgr.callback(tmedia_session_events_e.STREAM_LOCAL_REFUSED, This.e_type);
    }
}

tmedia_session_jsep01.onCreateSdpSuccess = function (o_sdp, _This) {
    tsk_utils_log_info("onCreateSdpSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc) {

        if ( o_sdp.type == "answer" && o_sdp.sdp.match("rtcp-mux") != null ) {
          o_sdp.sdp = o_sdp.sdp.replace(/a=rtcp:9 IN IP4 0.0.0.0\r\n/g, '');
        }        
        //No media bundle and RTCP-mux
        //o_sdp.sdp = o_sdp.sdp.replace(/a=(rtcp-mux|RTCP-MUX)\r\n/g, '');
        o_sdp.sdp = o_sdp.sdp.replace(/a=group:BUNDLE ([0-9./_ a-z]*)\r\n/g, '');

/*
        if ( tsk_utils_get_navigator_friendly_name() === 'firefox' ) {
          //Try to add RED and ulpFEC a-line for Firefox 51 or upper
          //a=rtpmap:97 H264/90000
          //a=rtpmap:122 red/90000
          //a=rtpmap:123 ulpfec/90000
          o_sdp.sdp = o_sdp.sdp.replace(/a=rtpmap:([0-9]*) H264\/90000\r\n/g, 'a=rtpmap:$1 H264\/90000\r\na=rtpmap:122 red\/90000\r\na=rtpmap:123 ulpfec\/90000\r\n');
          
          //Added new PTs on video m-line
          o_sdp.sdp = o_sdp.sdp.replace(/m=video ([0-9]*) UDP\/TLS\/RTP\/SAVPF 120 121 126 97/g, 'm=video $1 UDP\/TLS\/RTP\/SAVPF 120 121 126 97 122 123');
        }        
*/

        /*For Avoiding Firefox callee RED payload Type issue*/
        
        if ( tsk_utils_get_navigator_friendly_name() === 'chrome' || tsk_utils_get_navigator_friendly_name() === 'opera' ) {
           var red_pt,ulpfec_pt;
           var red_pt_attr = o_sdp.sdp.match('a=rtpmap:([0-9]*) red\/90000');
           if( red_pt_attr )
               red_pt = red_pt_attr[1];
           var ulpfec_pt_attr = o_sdp.sdp.match('a=rtpmap:([0-9]*) ulpfec\/90000');
           if( ulpfec_pt_attr )
               ulpfec_pt = ulpfec_pt_attr[1];

            //Change PT on M line and A line
            if ( red_pt > 0 && ulpfec_pt > 0 ) {
                var o_sdp_lo = tsdp_message.prototype.Parse(o_sdp.sdp);
                var o_hdr_M_video = o_sdp_lo.get_header_m_by_name("video");
                o_hdr_M_video.change_pt(red_pt, "122");
                o_hdr_M_video.change_pt(ulpfec_pt, "123");
                o_sdp.sdp = o_sdp_lo.toString();
            }    
        } 


        // Enable or disable OPUS FEC
        if (window.opus_fec != "checked" && window.opus_fec != true) {
            tsk_utils_log_warn( 'Disable OPUS FEC !' );
            o_sdp.sdp = o_sdp.sdp.replace(/useinbandfec=1/g, 'useinbandfec=0');                
        }        

         // bandwidth
        if (This.o_bandwidth) {
                tsk_utils_log_warn( 'Set the B line: ' + this.o_bandwidth );

                var o_sdp_lo = tsdp_message.prototype.Parse(o_sdp.sdp);
                var o_hdr_M_video = o_sdp_lo.get_header_m_by_name("video");
                var o_hdr_M_audio = o_sdp_lo.get_header_m_by_name("audio");
                if ( tsk_utils_get_navigator_friendly_name() === 'firefox' ) {
                        if (This.o_bandwidth.audio && o_hdr_M_audio ) {
                                o_hdr_M_audio.add_header(new tsdp_header_B("TIAS:" + This.o_bandwidth.audio));
                        }
                        
                        if (This.o_bandwidth.video && o_hdr_M_video ) {
                                o_hdr_M_video.add_header(new tsdp_header_B("TIAS:" + This.o_bandwidth.video));
                        }
                } else {
                        if (This.o_bandwidth.audio && o_hdr_M_audio ) {
                                o_hdr_M_audio.add_header(new tsdp_header_B("AS:" + This.o_bandwidth.audio));
                        }
                        
                        if (This.o_bandwidth.video && o_hdr_M_video ) {
                                o_hdr_M_video.add_header(new tsdp_header_B("AS:" + This.o_bandwidth.video));
                        }
                }
                o_sdp.sdp = o_sdp_lo.toString();
        }


         This.o_pc.setLocalDescription(o_sdp,
                         tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetLocalDescriptionSuccess : function () { tmedia_session_jsep01.onSetLocalDescriptionSuccess(This); },
            tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetLocalDescriptionError : function (s_error) { tmedia_session_jsep01.onSetLocalDescriptionError(s_error, This); }
        );
    }
}

tmedia_session_jsep01.onCreateSdpError = function (s_error, _This) {
    tsk_utils_log_info("onCreateSdpError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_mgr) {
        tsk_utils_log_error(s_error);
        This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
    }
}

tmedia_session_jsep01.onSetLocalDescriptionSuccess = function (_This) {
    tsk_utils_log_info("onSetLocalDescriptionSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc) {
        if ((This.o_pc.iceGatheringState || This.o_pc.iceState) === "complete") {
            tmedia_session_jsep01.onIceGatheringCompleted(This);
        }
        This.b_sdp_ro_offer = false; // reset until next incoming RO
    }
}

tmedia_session_jsep01.onSetLocalDescriptionError = function (s_error, _This) {
    tsk_utils_log_info("onSetLocalDescriptionError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_mgr) {
        tsk_utils_log_error(s_error.toString());
        This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
    }
}

tmedia_session_jsep01.onSetRemoteDescriptionSuccess = function (_This) {
    tsk_utils_log_info("onSetRemoteDescriptionSuccess");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This) {
        if (!This.b_sdp_ro_pending && This.b_sdp_ro_offer) {
            This.o_sdp_lo = null; // to force new SDP when get_lo() is called
        }
    }
}

tmedia_session_jsep01.onSetRemoteDescriptionError = function (s_error, _This) {
    tsk_utils_log_info("onSetRemoteDescriptionError");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This) {
        This.o_mgr.callback(tmedia_session_events_e.SET_RO_FAILED, This.e_type);
        tsk_utils_log_error(s_error);
    }
}

tmedia_session_jsep01.onIceGatheringCompleted = function (_This) {
    tsk_utils_log_info("onIceGatheringCompleted");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (This && This.o_pc) {
        if (!This.b_sdp_lo_pending) {
            tsk_utils_log_warn("onIceGatheringCompleted but no local sdp request is pending");
            return;
        }

        //Wait for all ICETransport. Added by rzhang
        // HACK: Firefox Nightly 20.0a1(2013-01-08): PeerConnection.localDescription has a wrong value (remote sdp). More info at https://bugzilla.mozilla.org/show_bug.cgi?id=828235
        var localDescription = (This.localDescription || This.o_pc.localDescription);

        var mline_amount = localDescription.sdp.match(/m=/g).length;
        var endCandidate_amount = localDescription.sdp.match(/a=candidate:[^\r\n]*\r\n[a-z]=(?!candidate)/g) ? localDescription.sdp.match(/a=candidate:[^\r\n]*\r\n[a-z]=(?!candidate)/g).length : 0;
        var bundle_array = localDescription.sdp.match(/a=group:BUNDLE [^\r\n]*\r\n/g) ?  localDescription.sdp.match(/a=group:BUNDLE [^\r\n]*\r\n/g)[0].split(' ') : undefined;
        var bundle_amount =  bundle_array ? (bundle_array.length - 1 ) - 1  : 0;// The first '-1' is for "a=group:BUNDLE" , the second '-1'  is for the bundled m line.  audio+video => auvideo   1+1 =>1
        if (mline_amount - bundle_amount > endCandidate_amount) {
            tsk_utils_log_info("Not all ICE gathering are done!!!! We need to wait ");
            return;
        }

        This.b_sdp_lo_pending = false;
        if (localDescription) {
            This.o_sdp_jsep_lo = localDescription;
            This.o_sdp_lo = tsdp_message.prototype.Parse(This.o_sdp_jsep_lo.sdp);
            This.decorate_lo();
            if (This.o_mgr) {
                This.o_mgr.callback(tmedia_session_events_e.GET_LO_SUCCESS, This.e_type);
            }
        }
        else {
            This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
            tsk_utils_log_error("localDescription is null");
        }
    }
}

tmedia_session_jsep01.onIceCandidate = function (o_event, _This) {
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (!This || !This.o_pc) {
        tsk_utils_log_error("This/PeerConnection is null: unexpected");
        return;
    }
    var iceState = (This.o_pc.iceGatheringState || This.o_pc.iceState);

    tsk_utils_log_info("onIceCandidate = " + iceState);

    if (iceState === "complete" || (o_event && !o_event.candidate)) {
        tsk_utils_log_info("ICE GATHERING COMPLETED!");
        tmedia_session_jsep01.onIceGatheringCompleted(This);
    }
    else if (This.o_pc.iceState === "failed") {
        tsk_utils_log_error("Ice state is 'failed'");
        This.o_mgr.callback(tmedia_session_events_e.GET_LO_FAILED, This.e_type);
    }
}

tmedia_session_jsep01.onNegotiationNeeded = function (o_event, _This) {
    tsk_utils_log_info("onNegotiationNeeded");
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (!This || !This.o_pc) {
        // do not raise error: could happen after pc.close()
        return;
    }
    if ((This.o_pc.iceGatheringState || This.o_pc.iceState) !== "new") {
        tmedia_session_jsep01.onGetUserMediaSuccess(This.b_lo_held ? null : This.o_local_stream, This);
    }
}

tmedia_session_jsep01.onSignalingstateChange = function (o_event, _This) {
    var This = (tmedia_session_jsep01.mozThis || _This);
    if (!This || !This.o_pc) {
        // do not raise error: could happen after pc.close()
        return;
    }
    tsk_utils_log_info("onSignalingstateChange:" + This.o_pc.signalingState);
    if (This.o_local_stream && This.o_pc.signalingState === "have-remote-offer") {
        tmedia_session_jsep01.onGetUserMediaSuccess(This.o_local_stream, This);
    }
}


tmedia_session_jsep01.prototype.__get_lo = function () {
    var This = this;
    if (!this.o_pc && !this.b_lo_held) {

        if ( tsk_utils_get_navigator_friendly_name() != 'firefox' ) {
            //Chrome / Opera     
            var o_video_constraints = {
                mandatory: {},
                optional: []
            };
            if ((this.e_type.i_id & tmedia_type_e.SCREEN_SHARE.i_id) == tmedia_type_e.SCREEN_SHARE.i_id) {
                o_video_constraints.mandatory.chromeMediaSource = 'screen';
            }
            if (this.e_type.i_id & tmedia_type_e.VIDEO.i_id) {
                /*if (this.o_video_size) {
                    if (this.o_video_size.minWidth) o_video_constraints.mandatory.minWidth = this.o_video_size.minWidth;
                    if (this.o_video_size.minHeight) o_video_constraints.mandatory.minHeight = this.o_video_size.minHeight;
                    if (this.o_video_size.maxWidth) o_video_constraints.mandatory.maxWidth = this.o_video_size.maxWidth;
                    if (this.o_video_size.maxHeight) o_video_constraints.mandatory.maxHeight = this.o_video_size.maxHeight;
                }*/
                if (window.v_width > 0 && window.v_height > 0) {
                        o_video_constraints.mandatory.minWidth = window.v_width;
                        o_video_constraints.mandatory.minHeight = window.v_height;
                        o_video_constraints.mandatory.maxWidth = window.v_width*2;
                        o_video_constraints.mandatory.maxHeight = window.v_height*2;
                        o_video_constraints.mandatory.minFrameRate = 10;
                        o_video_constraints.mandatory.maxFrameRate = 30;
                }
                try { tsk_utils_log_info("Video Contraints:" + JSON.stringify(o_video_constraints)); } catch (e) { }
            }
        } else {
            //Firefox
            var o_video_constraints = {
                width: {},
                height: {},
                framerate: {}
            };

            if (this.e_type.i_id & tmedia_type_e.VIDEO.i_id) {
                if (window.v_width > 0 && window.v_height > 0) {
                    o_video_constraints.width.min = window.v_width;
                    o_video_constraints.height.min = window.v_height;
                    o_video_constraints.width.max = window.v_width*2;
                    o_video_constraints.height.max = window.v_height*2;
                    o_video_constraints.framerate.min = 10;
                    o_video_constraints.framerate.max = 30;
                    o_video_constraints.framerate.exact = 15;
                }
                try { tsk_utils_log_info("Video Contraints:" + JSON.stringify(o_video_constraints)); } catch (e) { }
            }        

        }   


        var o_iceServers = this.ao_ice_servers;
        if (!o_iceServers) { // defines default ICE servers only if none exist (because WebRTC requires ICE)
            // HACK Nightly 21.0a1 (2013-02-18): 
            // - In RTCConfiguration passed to RTCPeerConnection constructor: FQDN not yet implemented (only IP-#s). Omitting "stun:stun.l.google.com:19302"
            // - CHANGE-REQUEST not supported when using "numb.viagenie.ca"
            // - (stun/ERR) Missing XOR-MAPPED-ADDRESS when using "stun.l.google.com"
            // numb.viagenie.ca: 66.228.45.110:
            // stun.l.google.com: 173.194.78.127
            // stun.counterpath.net: 216.93.246.18
            // "23.21.150.121" is the default STUN server used in Nightly
            //o_iceServers = tmedia_session_jsep01.mozThis
            //    ? [{ url: 'stun:23.21.150.121:3478' }, { url: 'stun:216.93.246.18:3478' }, { url: 'stun:66.228.45.110:3478' }, { url: 'stun:173.194.78.127:19302' }]
            //    : [{ url: 'stun:stun.l.google.com:19302' }, { url: 'stun:stun.counterpath.net:3478' }, { url: 'stun:numb.viagenie.ca:3478' }];
            //o_iceServers = [{ urls: 'stun: :3478'}];
            //o_iceServers = [{ urls: 'stun: :3478'}];

            if ( tsk_utils_get_navigator_friendly_name() === 'edge' ) {
                o_iceServers = [ { urls: 'turn:54.223.62.195:3478?transport=tcp', username: 'Trial15205ed7', credential: '1324d5b3db6d9c0e0ffcfb6e10c264af'} ];
            } else {
                o_iceServers = [{urls: 'stun:54.223.62.195:3478'}];    
            }        
        }
        try { tsk_utils_log_info("ICE servers:" + JSON.stringify(o_iceServers)); } catch (e) { }

        this.o_media_constraints.optional = [{'googDscp': false},{'googIPv6': false},{'googCpuOveruseDetection': false},{'enableDtlsSrtp': false}];
        this.o_pc = new window.RTCPeerConnection(
                (o_iceServers && !o_iceServers.length) ? {bundlePolicy: "balanced", rtcpMuxPolicy: "negotiate"} : { iceServers: o_iceServers, bundlePolicy: "balanced", rtcpMuxPolicy: "negotiate" },// empty array is used to disable STUN/TURN.
                this.o_media_constraints
        );
        this.o_pc.onicecandidate = tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onIceCandidate : function (o_event) { tmedia_session_jsep01.onIceCandidate(o_event, This); };
        this.o_pc.onnegotiationneeded = tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onNegotiationNeeded : function (o_event) { tmedia_session_jsep01.onNegotiationNeeded(o_event, This); };
        this.o_pc.onsignalingstatechange = tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSignalingstateChange : function (o_event) { tmedia_session_jsep01.onSignalingstateChange(o_event, This); };
                
        this.subscribe_stream_events();
    }

    if (!this.o_sdp_lo && !this.b_sdp_lo_pending) {
        this.b_sdp_lo_pending = true;

        // set penfing ro if there is one
        if (this.b_sdp_ro_pending && this.o_sdp_ro) {
            this.__set_ro(this.o_sdp_ro, true);
        }
        // get media stream
        if (this.e_type == tmedia_type_e.AUDIO && (this.b_cache_stream && __o_jsep_stream_audio)) {
            tmedia_session_jsep01.onGetUserMediaSuccess(__o_jsep_stream_audio, This);
        }
        else if (this.e_type == tmedia_type_e.AUDIO_VIDEO && (this.b_cache_stream && __o_jsep_stream_audiovideo)) {
            tmedia_session_jsep01.onGetUserMediaSuccess(__o_jsep_stream_audiovideo, This);
        }
        else {
            if (!this.b_lo_held && !this.o_local_stream) {
                this.o_mgr.callback(tmedia_session_events_e.STREAM_LOCAL_REQUESTED, this.e_type);
                navigator.getUserMedia(
                        {
                            audio: (this.e_type == tmedia_type_e.SCREEN_SHARE) ? false : !!(this.e_type.i_id & tmedia_type_e.AUDIO.i_id), // IMPORTANT: Chrome '28.0.1500.95 m' doesn't support using audio with screenshare
                            video: /*!!(this.e_type.i_id & tmedia_type_e.VIDEO.i_id)*/(this.e_type == tmedia_type_e.VIDEO || this.e_type == tmedia_type_e.AUDIO_VIDEO) ? o_video_constraints : false, // "SCREEN_SHARE" contains "VIDEO" flag -> (VIDEO & SCREEN_SHARE) = VIDEO
                            data: false
                        },
                        tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onGetUserMediaSuccess : function (o_stream) { tmedia_session_jsep01.onGetUserMediaSuccess(o_stream, This); },
                        tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onGetUserMediaError : function (s_error) { tmedia_session_jsep01.onGetUserMediaError(s_error, This); }
                    );
            }
        }
    }

    return this.o_sdp_lo;
}

tmedia_session_jsep01.prototype.__set_ro = function (o_sdp, b_is_offer) {
    if (!o_sdp) {
        tsk_utils_log_error("Invalid argument");
        return -1;
    }

    /* update remote offer */
    this.o_sdp_ro = o_sdp;
    this.b_sdp_ro_offer = b_is_offer;
    /* reset local sdp */
    if (b_is_offer) {
        this.o_sdp_lo = null;
    }

    if (this.o_pc) {
        try {
            var This = this;
            this.decorate_ro(false);
            tsk_utils_log_info("setRemoteDescription(" + (b_is_offer ? "offer)" : "answer)") + "\n" + this.o_sdp_ro);

            var r_sdp = new window.RTCSessionDescription({ type: b_is_offer ? "offer" : "answer", sdp: This.o_sdp_ro.toString() });
            //No media bundle and RTCP-mux
            //r_sdp.sdp = r_sdp.sdp.replace(/a=(rtcp-mux|RTCP-MUX)\r\n/g, '');
            r_sdp.sdp = r_sdp.sdp.replace(/a=group:BUNDLE [0-9./_ a-z]*\r\n/g, '');
            //Testing for DTLS fingerprint
            //r_sdp.sdp = r_sdp.sdp.replace(/a=fingerprint:sha-[0-9]* [A-Z:0-9]*\r\n/g, ''); //No-fingerprint
            //r_sdp.sdp = r_sdp.sdp.replace(/a=fingerprint:sha-([0-9]*) [A-Z:0-9]*\r\n/g, 'a=fingerprint:sha-$1 FF:BD:C3:F5:8F:16:7C:76:BC:5B:A5:46:A4:15:CA:40:7C:0B:4A:7A:77:7E:17:44:5E:64:A0:2C:A0:62:85:A2\r\n'); //wrong-fingerprint

            this.o_pc.setRemoteDescription(
               r_sdp,
               tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetRemoteDescriptionSuccess : function () { tmedia_session_jsep01.onSetRemoteDescriptionSuccess(This); },
               tmedia_session_jsep01.mozThis ? tmedia_session_jsep01.onSetRemoteDescriptionError : function (s_error) { tmedia_session_jsep01.onSetRemoteDescriptionError(s_error, This); }
            );
        }
        catch (e) {
            tsk_utils_log_error(e);
            this.o_mgr.callback(tmedia_session_events_e.SET_RO_FAILED, this.e_type);
            return -2;
        }
        finally {
            this.b_sdp_ro_pending = false;
        }
    }
    else {
        this.b_sdp_ro_pending = true;
    }

    return 0;
}

