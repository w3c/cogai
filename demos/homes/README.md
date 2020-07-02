# Smart Homes

* https://www.w3.org/Data/demos/chunks/home/

This demo was prepared for the AIOTI WG 3 task force on semantic interoperability, and features a room with sensors for temperature, luminance and presence, and actuators for lighting and heating.

The home's owners Janet and John have different preferences for the lighting hue and the desired room temperature, see the facts graph for details.

The rules are triggered when someone enters or leaves the room, and when the time of day changes. The reasoning process is bottom up, first applying the defaults, then the preferences of whoever is in the room, and finally, to apply the precedences for the lighting hue and room temperature. To save energy, the lights turn off in the morning or afternoon, unless you manually override them. See the rule graph for details.

The room temperature rises and falls according to the difference with the external temperature and whether the heating is on. The external temperature varies according to the time of day, see the value in the window.

The heating and cooling of the room is modelled as a pair of resistors and a capacitor, where the radiator temperature and the external temperature are modelled as voltage sources, leading to current flows into and out of the capacitor.
