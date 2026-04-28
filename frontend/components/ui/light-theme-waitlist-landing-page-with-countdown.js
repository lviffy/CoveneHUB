function _extends() {
  return (
    (_extends = Object.assign
      ? Object.assign.bind()
      : function (n) {
          for (var e = 1; e < arguments.length; e++) {
            var t = arguments[e];
            for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
          }
          return n;
        }),
    _extends.apply(null, arguments)
  );
}
import React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  QuadraticBezierCurve3,
  Vector3,
  TubeGeometry,
  ShaderMaterial,
  Mesh,
  AdditiveBlending,
  DoubleSide,
  Color,
  PlaneGeometry,
} from "three";
const Input = /*#__PURE__*/ React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return /*#__PURE__*/ React.createElement(
      "input",
      _extends(
        {
          type: type,
          className: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`,
          ref: ref,
        },
        props,
      ),
    );
  },
);
Input.displayName = "Input";
const Button = /*#__PURE__*/ React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return /*#__PURE__*/ React.createElement(
      "button",
      _extends(
        {
          className: `inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50  text-primary-foreground h-10 px-4 py-2 ${className}`,
          ref: ref,
        },
        props,
      ),
      children,
    );
  },
);
Button.displayName = "Button";
export function WaitlistExperience() {
  const mountRef = useRef(null);
  const sceneRef = useRef();
  const rendererRef = useRef();
  const animationIdRef = useRef();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 225,
    hours: 23,
    minutes: 17,
    seconds: 58,
  });

  // Three.js background effect - Enhanced with more visible beams
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new Scene();
    sceneRef.current = scene;
    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf8fafc, 0); // Set alpha to 0 for transparency
    mountRef.current.appendChild(renderer.domElement);

    // Create multiple curved light geometries for a more pronounced effect
    const curves = [
      new QuadraticBezierCurve3(
        new Vector3(-15, -3, 0),
        new Vector3(0, 1, 0),
        new Vector3(12, -2, 0), // Reduced right side extension
      ),
      new QuadraticBezierCurve3(
        new Vector3(-14, -2, 0),
        new Vector3(1, 2, 0),
        new Vector3(10, -1, 0), // Reduced right side extension
      ),
      new QuadraticBezierCurve3(
        new Vector3(-16, -4, 0),
        new Vector3(-1, 0.5, 0),
        new Vector3(11, -3, 0), // Reduced right side extension
      ),
    ];

    // Use ConveneHub brand colors
    const colors = [
      new Color(0x195adc),
      // ConveneHub Blue primary
      new Color(0x378ffa),
      // ConveneHub Blue tint 1
      new Color(0x5db0fd), // ConveneHub Blue tint 2
    ];

    // Create multiple light beams for a more pronounced effect
    curves.forEach((curve, index) => {
      // Create tube geometry for the light streak
      const tubeGeometry = new TubeGeometry(
        curve,
        200,
        index === 0 ? 0.8 : 0.6,
        32,
        false,
      );

      // Create gradient material with lighter colors
      const vertexShader = `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      const fragmentShader = `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Base color with reduced intensity
          vec3 baseColor = color;
          
          // Add subtle pulsing effect
          float pulse = sin(time * 1.5) * 0.1 + 0.9;
          
          // Create gradient effect from left to right
          float gradient = smoothstep(0.0, 1.0, vUv.x);
          
          // Center glow effect
          float glow = 1.0 - abs(vUv.y - 0.5) * 2.0;
          glow = pow(glow, 2.0);
          
          // Fade at the ends - more pronounced on the right
          float fade = 1.0;
          if (vUv.x > 0.7) {
            fade = 1.0 - smoothstep(0.7, 1.0, vUv.x);
          } else if (vUv.x < 0.2) {
            fade = smoothstep(0.0, 0.2, vUv.x);
          }
          
          // Final color with reduced intensity
          vec3 finalColor = baseColor * gradient * pulse * glow * fade * 0.8;
          
          gl_FragColor = vec4(finalColor, glow * fade * 0.6);
        }
      `;
      const material = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          time: {
            value: 0,
          },
          color: {
            value: colors[index],
          },
        },
        transparent: true,
        blending: AdditiveBlending,
        side: DoubleSide,
      });
      const lightStreak = new Mesh(tubeGeometry, material);
      lightStreak.rotation.z = index * 0.15;
      scene.add(lightStreak);
    });

    // Add background gradient plane with reduced opacity
    const backgroundGeometry = new PlaneGeometry(80, 55); // Smaller size to avoid right edge
    const backgroundMaterial = new ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        
        void main() {
          // ConveneHub brand gradient - blue to purple
          vec3 blue1 = vec3(0.6, 0.8, 1.0); // Light ConveneHub blue tint
          vec3 blue2 = vec3(0.36, 0.56, 0.99); // ConveneHub Blue (#5DB0FD)
          vec3 purple1 = vec3(0.78, 0.6, 0.93); // Light purple (#C6BEF4)
          
          // Animate the gradient slightly
          float timeFactor = sin(time * 0.2) * 0.05;
          
          // Create gradient effect from blue to purple
          vec3 color = mix(blue1, blue2, vUv.x + timeFactor);
          color = mix(color, purple1, vUv.x * 0.4 + timeFactor);
          
          // Add subtle noise for texture
          float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) * 0.05;
          
          // Add blur effect using smoothstep
          float blur = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
          
          gl_FragColor = vec4(color + noise, 0.15 * blur);
        }
      `,
      uniforms: {
        time: {
          value: 0,
        },
      },
      transparent: true,
      side: DoubleSide,
    });
    const background = new Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = -5;
    background.position.x = -2; // Shift slightly left to avoid right edge
    scene.add(background);

    // Position camera slightly to the left to avoid showing the right edge
    camera.position.z = 7;
    camera.position.y = -0.8;
    camera.position.x = -1;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Update all materials with time
      scene.traverse((object) => {
        if (
          object instanceof Mesh &&
          object.material instanceof ShaderMaterial
        ) {
          if (object.material.uniforms.time) {
            object.material.uniforms.time.value = time;
          }
        }
      });

      // Very subtle rotation for dynamic effect
      scene.children.forEach((child, index) => {
        if (child instanceof Mesh && index < curves.length) {
          child.rotation.z = Math.sin(time * 0.1 + index * 0.5) * 0.05;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();

      // Dispose of all geometries and materials
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          if (object.material instanceof ShaderMaterial) {
            object.material.dispose();
          }
        }
      });
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        return {
          days,
          hours,
          minutes,
          seconds,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
    }
  };
  return /*#__PURE__*/ React.createElement(
    "main",
    {
      className: "relative min-h-screen w-full overflow-hidden bg-white",
    },
    /*#__PURE__*/ React.createElement("div", {
      ref: mountRef,
      className: "fixed inset-0 w-full h-screen",
      style: {
        zIndex: 0,
      },
    }),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "relative z-10 min-h-screen",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex items-center justify-center min-h-screen px-4 pt-8",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "relative",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "relative backdrop-blur-xl bg-white/40 border border-[#C6BEF4]/60 rounded-3xl p-8 w-[420px] shadow-2xl",
            },
            /*#__PURE__*/ React.createElement("div", {
              className:
                "absolute inset-0 rounded-3xl bg-gradient-to-br from-[#F5F4FE]/80 to-transparent pointer-events-none",
            }),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "relative z-10",
              },
              !isSubmitted
                ? /*#__PURE__*/ React.createElement(
                    React.Fragment,
                    null,
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "mb-8 text-center",
                      },
                      /*#__PURE__*/ React.createElement(
                        "h1",
                        {
                          className:
                            "text-4xl font-bold text-[#010101] mb-4 tracking-tight",
                        },
                        "Join the waitlist",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className:
                            "text-[#010101]/70 text-base leading-relaxed font-normal",
                        },
                        "Get early access to ConveneHub - the ultimate ecosystem",
                        /*#__PURE__*/ React.createElement("br", null),
                        "for the entertainment industry",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "form",
                      {
                        onSubmit: handleSubmit,
                        className: "mb-6",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "flex gap-3",
                        },
                        /*#__PURE__*/ React.createElement(Input, {
                          type: "email",
                          placeholder: "your.email@example.com",
                          value: email,
                          onChange: (e) => setEmail(e.target.value),
                          required: true,
                          className:
                            "flex-1 bg-white/70 border-[#C6BEF4] text-[#010101] placeholder:text-[#010101]/50 focus:border-[#195ADC] focus:ring-[#195ADC]/30 h-12 rounded-xl backdrop-blur-sm",
                        }),
                        /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            type: "submit",
                            className:
                              "h-12 px-6 bg-[#195ADC] hover:bg-[#378FFA] text-white font-semibold cursor-pointer rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl shadow-[#195ADC]/25",
                          },
                          "Sign Up",
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "flex items-center justify-center gap-3 mb-6",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "flex -space-x-2",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "w-8 h-8 rounded-full bg-[#195ADC] border-2 border-white flex items-center justify-center text-white text-xs font-semibold",
                          },
                          "E",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "w-8 h-8 rounded-full bg-[#7F56D9] border-2 border-white flex items-center justify-center text-white text-xs font-semibold",
                          },
                          "O",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "w-8 h-8 rounded-full bg-[#378FFA] border-2 border-white flex items-center justify-center text-white text-xs font-semibold",
                          },
                          "N",
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "span",
                        {
                          className: "text-[#010101]/70 text-sm font-medium",
                        },
                        "~ 20+ Creators already joined",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "flex items-center justify-center gap-6 text-center",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "text-2xl font-bold text-[#195ADC]",
                          },
                          timeLeft.days,
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "text-xs text-[#010101]/60 uppercase tracking-wide font-medium",
                          },
                          "days",
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "text-[#C6BEF4]",
                        },
                        "|",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "text-2xl font-bold text-[#195ADC]",
                          },
                          timeLeft.hours,
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "text-xs text-[#010101]/60 uppercase tracking-wide font-medium",
                          },
                          "hours",
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "text-[#C6BEF4]",
                        },
                        "|",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "text-2xl font-bold text-[#195ADC]",
                          },
                          timeLeft.minutes,
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "text-xs text-[#010101]/60 uppercase tracking-wide font-medium",
                          },
                          "minutes",
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "text-[#C6BEF4]",
                        },
                        "|",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "text-2xl font-bold text-[#195ADC]",
                          },
                          timeLeft.seconds,
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "text-xs text-[#010101]/60 uppercase tracking-wide font-medium",
                          },
                          "seconds",
                        ),
                      ),
                    ),
                  )
                : /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-center py-4",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#DAEDFF] to-[#BEE0FF] flex items-center justify-center border border-[#5DB0FD]",
                      },
                      /*#__PURE__*/ React.createElement(
                        "svg",
                        {
                          className: "w-8 h-8 text-[#195ADC]",
                          fill: "none",
                          stroke: "currentColor",
                          viewBox: "0 0 24 24",
                        },
                        /*#__PURE__*/ React.createElement("path", {
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                          d: "M5 13l4 4L19 7",
                        }),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "h3",
                      {
                        className: "text-xl font-bold text-[#010101] mb-2",
                      },
                      "You're on the list!",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "text-[#010101]/70 text-sm font-normal",
                      },
                      "We'll notify you when we launch. Thanks for joining!",
                    ),
                  ),
            ),
            /*#__PURE__*/ React.createElement("div", {
              className:
                "absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none",
            }),
          ),
          /*#__PURE__*/ React.createElement("div", {
            className:
              "absolute inset-0 rounded-3xl bg-gradient-to-r from-[#5DB0FD]/20 to-[#A998ED]/20 blur-xl scale-110 -z-10",
          }),
        ),
      ),
    ),
  );
}
