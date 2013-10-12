//Please report bugs at https://github.com/rajbot/mixxx_touchosc_mapping

function TouchOSC() {}
TouchOSC.button_state = {"released":0x00, "pressed":0x7F};

TouchOSC.push_buttons = {
    0x02: 'beatsync',
    0x03: 'cue_default',
    0x08: 'cue_default',
    0x09: 'beatsync',
}

TouchOSC.leds = {
    '[Channel1]': {'play': 0x04, },
    '[Channel2]': {'play': 0x07, },
}

TouchOSC.global_timer = null;


// init()
//________________________________________________________________________________________
TouchOSC.init = function(id) {
    midi.sendShortMsg(0xB1,0x04,0x00); //Turn off the Deck A Play LED
    midi.sendShortMsg(0xB1,0x07,0x00); //Turn off the Deck B Play LED

    engine.connectControl('[Channel1]', 'play', 'TouchOSC.play_status');
    engine.connectControl('[Channel2]', 'play', 'TouchOSC.play_status');
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


// jog()
//________________________________________________________________________________________
TouchOSC.jog = function(channel, control, value, status, group) {
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
    //I couldn't get cue or beatsync to work with a script binding..
    //The button will be lit in the Mixxx UI when the button is held down (value==0x7F)
    //and then unlit when the button is released (value==0x00)
    var action = TouchOSC.push_buttons[control];
    engine.setValue(group, action, (0!=value));
};

