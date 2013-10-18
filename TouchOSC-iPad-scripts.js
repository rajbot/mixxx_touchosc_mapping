//Please report bugs at https://github.com/rajbot/mixxx_touchosc_mapping

TouchOSC = new function() {
}

TouchOSC.button_state = {"released":0x00, "pressed":0x7F};

TouchOSC.push_buttons = {
    0x02: 'beatsync',
    0x03: 'cue_default',
    0x08: 'cue_default',
    0x09: 'beatsync',
    0x39: 'filterLowKill',
    0x3A: 'filterMidKill',
    0x3B: 'filterHighKill',
    0x44: 'filterLowKill',
    0x45: 'filterMidKill',
    0x46: 'filterHighKill',
}

TouchOSC.leds = {
    '[Channel1]': {'play':     0x04,
                   'cue_mode': 0x0C, },
    '[Channel2]': {'play':     0x07,
                   'cue_mode': 0x16, },
}

TouchOSC.global_timer = null;

TouchOSC.cue_mode = {'[Channel1]': 'goto', '[Channel2]': 'goto'};
TouchOSC.jog_mode = {'[Channel1]': 'jog',  '[Channel2]': 'jog'};

// init()
//________________________________________________________________________________________
TouchOSC.init = function(id) {
    midi.sendShortMsg(0xB1, 0x04, 0x00); //Turn off the Deck 1 Play LED
    midi.sendShortMsg(0xB1, 0x07, 0x00); //Turn off the Deck 2 Play LED
    midi.sendShortMsg(0xB1, 0x1B, 0x00); //Deck 1 browse led
    midi.sendShortMsg(0xB1, 0x24, 0x00); //Deck 2 browse led

    ['[Channel1]', '[Channel2]'].forEach(function(channel) {
        ['volume', 'play'].forEach(function(control) {
            engine.connectControl(channel, control, 'TouchOSC.'+control+'_status');
            engine.trigger(channel, control);  //play status led not updating
        });
    });

    engine.connectControl('[Master]', 'crossfader', 'TouchOSC.crossfader_status');
}


// play()
//________________________________________________________________________________________
TouchOSC.play = function(channel, control, value, status, group) {
    //play_status will be called to turn/off the LEDs
    if (value == TouchOSC.button_state.pressed) {
        var currently_playing = engine.getValue(group, 'play');
        if (currently_playing ) {
            engine.setValue(group, 'play', 0);  //stop
        } else {
            engine.setValue(group, 'play', 1);  //play
        }
    }
};


// play_status()
//________________________________________________________________________________________
TouchOSC.play_status = function(value, group, control) {
    var currently_playing = engine.getValue(group, 'play');
    if (currently_playing ) {
        midi.sendShortMsg(0xB1, TouchOSC.leds[group][control], 0x7F);
    } else {
        midi.sendShortMsg(0xB1, TouchOSC.leds[group][control], 0x0);
    }
}


// volume_status()
//________________________________________________________________________________________
TouchOSC.volume_status = function(value, group, control) {
    var num;
    if ('[Channel1]' == group) {
        num = 0x25;
    } else {
        num = 0x2A;
    }
    midi.sendShortMsg(0xB0, num, 127*value);
}


// crossfader_status()
//________________________________________________________________________________________
TouchOSC.crossfader_status = function(value, group, control) {
    midi.sendShortMsg(0xB0, 0x11, 64*value+64);
}


// jog()
//________________________________________________________________________________________
TouchOSC.jog = function(channel, control, value, status, group) {

    if(TouchOSC.jog_mode[group] == 'browse') {
        if (0 == value) {
            engine.setValue('[Playlist]', 'SelectPrevTrack', true);
        } else {
            engine.setValue('[Playlist]', 'SelectNextTrack', true);
        }
        return;
    }

    var jog_dir;
    var action;


    var currently_playing = engine.getValue(group, 'play');
    if (currently_playing) {
        if (0 == value) {
            action = 'rate_temp_down';
        } else {
            action = 'rate_temp_up';
        }
        jog_dir = true;
        if (null == TouchOSC.global_timer) {
            TouchOSC.global_timer = engine.beginTimer(200, "TouchOSC.jog_disable('" + group + "')", true); //one shot
        } else {
            //print("timer already set, not adjusting rate");
            return;
        }
    } else {
        action = 'jog';
        if (0 == value) {
            jog_dir = -1;
        } else {
            jog_dir = 1;
        }
    }

    //print(action);
    engine.setValue(group, action , jog_dir);
}


// jog_disable()
//________________________________________________________________________________________
TouchOSC.jog_disable = function(group) {
    //print("jog_disable: "+group);
    TouchOSC.global_timer = null;
    engine.setValue(group,'rate_temp_down',false);
    engine.setValue(group,'rate_temp_up',false);
}


// toggle_jog_mode()
//________________________________________________________________________________________
TouchOSC.toggle_jog_mode = function(channel, control, value, status, group) {
    if (value != TouchOSC.button_state.pressed) return;

    var led;
    if ('[Channel1]' == group) {
        led = 0x1B;
    } else {
        led = 0x24;
    }

    //when toggle_jog_mode is called, `this` does not refer to an instance of a TouchOSC object,
    //so we can't use `this.jog_mode` to store state.. hmm
    if (TouchOSC.jog_mode[group] == 'jog') {
        TouchOSC.jog_mode[group] = 'browse';
        midi.sendShortMsg(0xB1, led, 0x7F);
    } else {
        TouchOSC.jog_mode[group] = 'jog';
        midi.sendShortMsg(0xB1, led, 0);
    }
};


// load_track()
//________________________________________________________________________________________
TouchOSC.load_track = function(channel, control, value, status, group) {
    engine.setValue(group, "LoadSelectedTrack", 1);
    if (TouchOSC.jog_mode[group] == 'browse') {
        TouchOSC.toggle_jog_mode(channel, control, value, status, group);
    }
}


// cue()
//________________________________________________________________________________________
TouchOSC.cue = function(channel, control, value, status, group) {
    //I couldn't get cue_default to work with a script binding..
    if (value == TouchOSC.button_state.pressed) {
        engine.setValue(group, "cue_default", 1);
        engine.setValue(group, "cue_default", 0); //turn off the cue light in the Mixxx UI
    }
};


// push_button()
//________________________________________________________________________________________
TouchOSC.push_button = function(channel, control, value, status, group) {
    //I couldn't get cue, beatsync, or filterkill buttons to work without a script binding..
    //The button will be lit in the Mixxx UI when the button is held down (value==0x7F)
    //and then unlit when the button is released (value==0x00)
    var action = TouchOSC.push_buttons[control];
    engine.setValue(group, action, (0!=value));
};


// play_position()
//________________________________________________________________________________________
TouchOSC.play_position = function(channel, control, value, status, group) {
    //don't scrub the currently-playing track, in order to avoid accidental input
    var currently_playing = engine.getValue(group, 'play');
    if (currently_playing) {
        return;
    }
    var pos_val = 1.14 / 127 * value;
    engine.setValue(group, 'playposition', pos_val);
};


// toggle_cue_mode()
//________________________________________________________________________________________
TouchOSC.toggle_cue_mode = function(channel, control, value, status, group) {
    if (value != TouchOSC.button_state.pressed) return;

    //when toggle_cue_mode is called, `this` does not refer to an instance of a TouchOSC object,
    //so we can't use `this.cue_mode` to store state.. hmm
    if (TouchOSC.cue_mode[group] == 'goto') {
        TouchOSC.cue_mode[group] = 'set';
        midi.sendShortMsg(0xB1, control, 0x7F);
    } else {
        TouchOSC.cue_mode[group] = 'goto';
        midi.sendShortMsg(0xB1, control, 0);
    }
};


// hot_cue()
//________________________________________________________________________________________
TouchOSC.hot_cue = function(channel, control, value, status, group) {
    if (value != TouchOSC.button_state.pressed) return;
    var que_mode = TouchOSC.cue_mode[group];
    print (value);
    if (control <= 0x10) {
        var cue_num = control - 0x0C;
    } else {
        var cue_num = -(control - 0x16);
    }

    var enabled = engine.getValue(group, 'hotcue_'+cue_num+'_enabled');
    if ('set' == que_mode) {
        if (enabled) {
            engine.setValue(group, 'hotcue_'+cue_num+'_clear', 1);
            midi.sendShortMsg(0xB1, control, 0);
        } else {
            engine.setValue(group, 'hotcue_'+cue_num+'_set', 1);
            midi.sendShortMsg(0xB1, control, 0x7F);
        }
    } else {
        if (enabled) {
            engine.setValue(group, 'hotcue_'+cue_num+'_goto', 1);
        } else {
            engine.setValue(group, 'hotcue_'+cue_num+'_set', 1);
            midi.sendShortMsg(0xB1, control, 0x7F);
        }
    }
};

