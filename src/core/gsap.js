import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, ScrambleTextPlugin);

// House eases: long, decelerating tails read as "drifting in space".
CustomEase.create('cosmic', '0.16, 1, 0.3, 1'); // fast launch, very long settle
CustomEase.create('warp', '0.76, 0, 0.24, 1'); // hard in-out for overlays and wipes
CustomEase.create('drift', '0.33, 0, 0.12, 1'); // softer settle for scrubbed depth moves
CustomEase.create('aperture', '0.65, 0, 0.1, 1'); // loader iris

gsap.defaults({ ease: 'cosmic', duration: 1.2 });
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText, CustomEase };
