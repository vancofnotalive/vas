let isNotificationAlive = false;
function createStarField(container, options = {}) {
  // allow passing a selector string or an element
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) {
    console.warn('createStarField: container not found', container);
    return;
  }

  const settings = {
    shootingStarChance: options.shootingStarChance ?? 0.5,
    shootingStarInterval: options.shootingStarInterval ?? 100,
  };

  // make sure the container can host an absolutely-positioned canvas
  const computedPosition = getComputedStyle(el).position;
  if (computedPosition === 'static') {
    el.style.position = 'relative';
  }
  el.style.overflow = 'hidden';

  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  el.insertBefore(canvas, el.firstChild); // put it behind other content

  const ctx = canvas.getContext('2d');

  let width, height;
  function resize() {
    width = canvas.width = el.clientWidth;
    height = canvas.height = el.clientHeight;
  }
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(el);

  // shooting stars
  const shootingStars = [];
  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.5,
      length: Math.random() * 80 + 60,
      speed: Math.random() * 8 + 6,
      angle: Math.PI / 4,
      opacity: 1
    });
  }

  const shootingInterval = setInterval(() => {
    if (Math.random() < settings.shootingStarChance) spawnShootingStar();
  }, settings.shootingStarInterval);

  let animationFrameId;
  let running = true;

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    // shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      const dx = Math.cos(s.angle) * s.length;
      const dy = Math.sin(s.angle) * s.length;

      const gradient = ctx.createLinearGradient(s.x, s.y, s.x - dx, s.y - dy);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - dx, s.y - dy);
      ctx.stroke();

      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      s.opacity -= 0.01;

      if (s.opacity <= 0 || s.x > width + 100 || s.y > height + 100) {
        shootingStars.splice(i, 1);
      }
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  // return a handle so you can stop/clean up this instance if needed
  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animationFrameId);
      clearInterval(shootingInterval);
      resizeObserver.disconnect();
      canvas.remove();
    }
  };
}

function createStarBackground(container, options = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) {
    console.warn('createStarBackground: container not found', container);
    return;
  }

  const settings = {
    starCount: options.starCount ?? 200,
    starSpeedMin: options.starSpeedMin ?? 0.1,
    starSpeedMax: options.starSpeedMax ?? 0.4,
    driftAngle: options.driftAngle ?? { x: -1, y: 0.3 },
  };

  const computedPosition = getComputedStyle(el).position;
  if (computedPosition === 'static') {
    el.style.position = 'relative';
  }
  el.style.overflow = 'hidden';

  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  el.insertBefore(canvas, el.firstChild);

  const ctx = canvas.getContext('2d');

  let width = 0, height = 0;
  let stars = [];

  function makeStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.3 + 0.3,
      baseAlpha: Math.random() * 0.6 + 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
      speed: Math.random() * (settings.starSpeedMax - settings.starSpeedMin) + settings.starSpeedMin
    };
  }

  function regenerateStars() {
    stars = [];
    for (let i = 0; i < settings.starCount; i++) {
      stars.push(makeStar());
    }
  }

  function resize() {
    const newWidth = el.clientWidth;
    const newHeight = el.clientHeight;

    // only bother if size is real and actually changed
    if (newWidth <= 0 || newHeight <= 0) return;
    if (newWidth === width && newHeight === height) return;

    width = canvas.width = newWidth;
    height = canvas.height = newHeight;

    // (re)build stars now that we have a real, valid size
    regenerateStars();
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(el);

  let t = 0;
  let animationFrameId;
  let running = true;

  function draw() {
    if (!running) return;

    if (width > 0 && height > 0) {
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        const alpha = star.baseAlpha + Math.sin(t * star.twinkleSpeed + star.twinklePhase) * 0.3;
        const radiusPulse = star.radius + Math.sin(t * star.twinkleSpeed + star.twinklePhase) * 0.4;

        ctx.beginPath();
        ctx.arc(star.x, star.y, Math.max(0.2, radiusPulse), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, alpha))})`;
        ctx.fill();

        star.x += star.speed * settings.driftAngle.x;
        star.y += star.speed * settings.driftAngle.y;

        if (star.x < -5) star.x = width + 5;
        if (star.x > width + 5) star.x = -5;
        if (star.y < -5) star.y = height + 5;
        if (star.y > height + 5) star.y = -5;
      }

      t++;
    }

    animationFrameId = requestAnimationFrame(draw);
  }

  draw();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.remove();
    }
  };
}

















function headAnimation() {
    document.querySelector(".hill-image").classList.add("hill-image--load")
document.querySelector(".layout-desktop ._profile").classList.add("_profile--active");
setTimeout(() => {
document.querySelector(".pc-body-b").style.display = "contents"
}, 2200)
}

function welcomeLoad() {
   let containerShooting =  document.querySelector(".layout-desktop .welcome-star-shooting");
   let container =  document.querySelector(".layout-desktop ._welcome-container");
   let containerBg =  document.querySelector(".layout-desktop ._welcome-container .welcome-star-bg");

   container.classList.add("_welcome-container--active")
   createStarField(containerShooting , {
    starCount: 100,
    shootingStarChance: 0.7
   })
   createStarBackground(containerBg, {
  starCount: 150,
  starSpeedMin: 0.1,
  starSpeedMax: 0.4,
  driftAngle: { x: -1, y: 0.3 }
});
setTimeout(() => {
  
loadPhase1()
}, 400)
}
window.addEventListener("load" , () => {
    document.querySelector(".layout-phone").addEventListener("scroll" , (e) => {
    let target = e.target;
    let scrollVal = target.scrollTop;
      let headH = document.querySelector(".phone-head").clientHeight - 1;
      let aboutMe = document.querySelector(".phone-about-me");
if (scrollVal < (headH * 0.7)) {
  let phoneProjects = document.querySelector(".phone-projects");
  phoneProjects.classList
  .remove("phone-projects--active")

  phoneProjects.querySelector(".phone-projs").style.overflow = "hidden";
  phoneProjects.querySelector(".phone-projs").scrollTop = "0"
}
else if (scrollVal >= (headH * 0.7) && 
scrollVal < (headH * 1.6)) {
  
  document.querySelector(".phone-projs").style.removeProperty("overflow")
  let part = document.querySelector(".phone-projects");
  if (!part.classList.contains("phone-projects--active")) {
    part.classList.add("phone-projects--active")

    
    aggressiveScroll(target , headH , 1000)
  }
  document.querySelector(".phone-about-me").classList
  .remove("_phone-about--active")
}
else if (scrollVal >= headH * 1.6
  && scrollVal < ((headH * 1.8) + aboutMe.clientHeight - 1)
) {
let about =  aboutMe
if (!about.classList.contains("_phone-about--active")) {
  aggressiveScroll(target , headH * 2 , 1000)
  about.classList.add("_phone-about--active")
}
let contact = document.querySelector(".phone-contact");
 contact.classList.remove("phone-contact--active")
 contact.querySelector("video").pause();
}
else if (scrollVal > ((headH * 1.8) + aboutMe.clientHeight - 1)) {
let contact = document.querySelector(".phone-contact");
if (!contact.classList.contains("phone-contact--active")) {
  contact.classList.add("phone-contact--active")
  aggressiveScroll(target , (headH * 2) + aboutMe.clientHeight , 1000)
  contact.querySelector("video").play();
}

}


  })


  // r
  document.querySelector(".layout-desktop")
  .addEventListener("scroll" , (e) => {

    let head = document.querySelector(".pc-head");
    let scrollVal = e.target.scrollTop;
    let target = e.target;
    if (scrollVal < head.clientHeight) {
      
let section = document.querySelector(".pc-projects");
section.classList.remove("_projects--active")
    }
    else if (scrollVal >= head.clientHeight &&
      scrollVal < head.clientHeight * 1.8
    ) {
    
        
      
  let section = document.querySelector(".pc-projects");
  if (!section.classList.contains("_projects--active")) {
    section.classList.add("_projects--active")
aggressiveScroll(e.target , head.clientHeight , 1000)
}
document.querySelector(".pc-about-me").classList.remove("_about-me--active")
}
else if (scrollVal >= head.clientHeight * 1.8 
  && scrollVal < head.clientHeight * 2.8
)    {
 let aboutMe =  document.querySelector(".pc-about-me");
 if (!aboutMe.classList.contains("_about-me--active")) {

   aboutMe.classList.add("_about-me--active")
   let val = head.clientHeight * 2;
   aggressiveScroll(e.target , val , 1000)
  }
  let sect = document.querySelector(".pc-contact-me");
  sect.classList.remove("_contact--active")
  sect.querySelector("video").pause()
}
else if (scrollVal >= head.clientHeight * 2.8
) {
let sect = document.querySelector(".pc-contact-me");
if (!sect.classList.contains("_contact--active")) {
  aggressiveScroll(e.target , head.clientHeight * 3 , 1000)
  sect.classList.add("_contact--active")
  sect.querySelector("video").play()
}
}
  })
const container = document.querySelector(".phone-projs");
const projects = container.querySelectorAll(".phone-project"); // adjust selector

// Figure out if you're snapping to 'start' or 'center'
// (match this to your CSS scroll-snap-align value)
const SNAP_ALIGN = "start"; // or "center"

function updateSnappedProject() {
  const containerRect = container.getBoundingClientRect();

  // The point we're comparing against (relative to container)
  const snapPoint =
    SNAP_ALIGN === "center"
      ? containerRect.top + containerRect.height / 2
      : containerRect.top;

  let closest = null;
  let closestDistance = Infinity;

  projects.forEach((proj) => {
    const rect = proj.getBoundingClientRect();
    const projPoint =
      SNAP_ALIGN === "center" ? rect.top + rect.height / 2 : rect.top;

    const distance = Math.abs(projPoint - snapPoint);

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = proj;
    }
  });

  projects.forEach((proj) => proj.classList.remove("_phone-project--active"));
  if (closest) closest.classList.add("_phone-project--active");
}

container.addEventListener("scrollend", updateSnappedProject);

// Run once on load in case a project starts snapped
updateSnappedProject();
  setTimeout(() => {
    
    welcomeLoad()
  let projectsSection = document.querySelector(".pc-projects-star-bg");
          createStarBackground(projectsSection)
createStarBackground(document.querySelector(".pc-about-me"))
createStarField(document.querySelector(".pc-about-me"))
  createStarBackground(document.querySelector(".pc-contact-content"))

  loadPhone()
let ageValue = getAge(new Date(2008 , 1 , 15));

document.querySelectorAll("._age-value").forEach(e => 
  e.textContent = ageValue
)
}, 100)
    
})

function toHead() {
 document.querySelector(".layout-desktop ._welcome-container").classList.add("_welcome-container--complete")
   document.querySelector(".layout-desktop ._welcome-container").style.tranisition = "800ms"
   document.querySelector(".layout-desktop ._welcome-container").style.opacity = "0"
   setTimeout(() => {
document.querySelector(".layout-desktop ._welcome-container").style.display = "none"
   }, 801)
}
function loadPhase1() {
  
  
let deskPhase =    document.querySelector(".layout-desktop ._phase-one")
deskPhase.classList.add("_phase--load")
deskPhase.querySelector("h1").style.opacity = "1"
deskPhase.querySelector("h1").style.transform = "translate(0 , 0%) scale(1)"
setTimeout(() => {
    
    deskPhase.querySelector("h1").style.opacity = "0"
    deskPhase.querySelector("h1").style.transform = "translate(0 , -50%) scale(0.7)"
    deskPhase.querySelector("h2").style.opacity = "1"
    deskPhase.querySelector("h2").style.transform = "translate(0 , -100%) scale(1)"
    createStarBackground(document.querySelector(".pc-head-star-bg") , {
        starCount: 150,
  starSpeedMin: 0.1,
  starSpeedMax: 0.4,
  driftAngle: { x: -1, y: 0.3 }
    })
createStarField(document.querySelector(".pc-head-star-shooting") , {
    starCount: 100,
    shootingStarChance: 0.7
   })
    setTimeout(() => {
      document.querySelector(".hill-image").style.opacity = "1";
        toHead();
    
        setTimeout(() => {
          
          
            headAnimation()
        }, 0)
    }, 1200)
}, 1200)
}
let snapScroll = true;
function buildBody(temp = false) {

  
  let body = ` <section class="pc-about pc-projects">
<section class="pc-projects-star-bg"></section>
            <section class="pc-projects-bg">
                <img src="./projects.png" alt="">
            </section>
            <section class="pc-projects-content">
<h1 class="pc-projects-heading"><span>Projects</span></h1>
<section class="pc-projects-container">
    <section class="pc-project _project">
<section class="pc-project-head _preview-project-image">
    <img src="./nothing-figma.png" alt="">
</section>
<section class="pc-project-body">

    <h1 class="pc-project-name">Nothing Website Clone</h1>
    <p>
        This is another landing page. It’s a reimagined version of the Nothing Phone brand’s landing page, showcasing how I would design a website for Nothing if I were given the opportunity.

    </p>
</section>
<a href=""><span>Visit</span></a>
</section>
<section class="pc-project  _project">
<section class="pc-project-head _preview-project-image">
    <img src="./unify-figma.png" alt="">
</section>
<section class="pc-project-body">

    <h1 class="pc-project-name">Unify Chat Website</h1>
    <p>
This is a landing page from one of my side projects. 
It’s presented as an example of my web design style.
 The links on this page are intentionally non-functional, as it’s meant to showcase the overall design and layout I can create for your website.




    </p>
</section>
<a href=""><span>Visit</span></a>
</section>
<section class="pc-project _project">
<section class="pc-project-head _preview-project-image">
    <img src="./niot-figma.png" alt="">
</section>
<section class="pc-project-body">

    <h1 class="pc-project-name">Backend Developer Portfolio Website</h1>
    <p>
        This is another example of my web design work. It showcases what a portfolio website designed by me could look like for you.

Alternatively, this page itself is also a showcase of my web design skills.

    </p>
</section>
<a href=""><span>Visit</span></a>
</section>




            </section>            
</section>
            
        </section>
        

         <section class="pc-about-me">
            <section class="pc-about-do">
<h1 class="pc-do-heading">
    <span>What I do</span>
</h1>
<p>
  
 • I build clean, good-looking frontend websites for people who want to 
    showcase their work, including portfolios, personal pages, project showcases, 
    resumes, or simple one page profiles about you.
    
    <br>
    <br>
   • These are pure frontend sites, built with HTML, CSS, and JavaScript 
    only. No backend, no database, no server side complexity. Just a fast, 
    lightweight site that loads instantly and looks great on any device.
    <br>
    <br>
   • Perfect for anyone who needs a single page (or a few pages) containing 
    your details, work, links, and information: the kind of site you'd 
    share with a client, recruiter, or on social media.
    <br>
    <br>
  •  Sites are hosted on GitHub Pages, and if you'd like, I can 
    also set up a custom domain so it's your own branded link instead of 
    a github.io URL.
    <br>
    <br>
  •  If you're unsure whether your website idea can be built by me, 
    feel free to DM me on my social media.
</p>
            </section>
            <section class="pc-about-profile">
                <h1 class="pc-about-heading">
                    <span>About Me</span>
                </h1>

                <section class="pc-about-profile-img">
                    <img src="./vcimage-removebg-preview.png" alt="">
                    <img class="pfp" src="./pfp.jpg" alt="">
                </section>
            </section>
            <section class="pc-about-i-am">
                <h1 class="pc-i-am-heading">
    <span>Who I am</span>
</h1>
<p>
• I'm VAS, <span class="_age-value">18</span> years old, originally from Scotland and currently based in India. <br> <br>
 I know HTML, CSS, JavaScript, C#, and full stack development, but for now I only offer frontend based websites with no backend, no server, and no database.
<br>
<br>
 I have 5 years of experience in overall programming: 3 years of HTML, CSS, and JavaScript, and 2 years of .NET Core web development.
<br>
<br>
I also create assets for the websites I make, such as icons, logos, and a bit of photo editing.





</p>
            </section>
        </section>
        <section class="pc-contact-me">
            <section class="pc-contact-video">
<video muted loop playsinline>
  <source src="./[Drone Freestyle] Mountain Landscape With Snow _ Free Stock Footage _ Creative Common Video.mp4" type="video/mp4">
</video>
            </section>
            <section class="pc-contact-content">
<h1 class="pc-contact-heading">
    <span>Contact Me</span>
</h1>
<section class="pc-contact-items">


<section class="pc-contact-medias">
<button class="discord _media--discord">
    <div>

        <img src="./discord.png" alt="">
    </div>
    <h1>Discord</h1>
</button>
<button class="instagram _media--insta">
    <div>

        <img src="./instagram.png" alt="">
    </div>
    <h1>Instagram</h1>
</button>
<button class="github _media--git">
    <div>

        <img src="./github.svg" alt="">
    </div>
    <h1>Github</h1>
</button>
<button class="facebook _media--face">
    <div>

        <img src="./facebook.svg" alt="">
    </div>
    <h1>Facebook</h1>
</button>
<button class="pin _media--pin">
    <div>

        <img src="./pinterest.svg" alt="">
    </div>
    <h1>Pinterest </h1>
</button>
<button class="x _media--x">
    <div>

        <img src="./x.svg" alt="">
    </div>
    <h1>(Twitter)</h1>
</button>

</section>
<section class="pc-contact-other">
    <button>
        <div>
            <img src="./envelope-solid-full.svg" alt="">
        </div>
        <h1>john.doe@example.com</h1>
    </button>
    <button>
        <div>
            <img src="./phone-call-icon.svg" alt="">
        </div>
        <h1>+91 00000 00000</h1>
    </button>
</section>

</section>
            </section>
        </section>
       `;
        let appendElements = new DOMParser().parseFromString(body , "text/html")
        setTimeout(() => {

          document.querySelector(".layout-desktop")
          .append(...appendElements.body.childNodes);
        
}, 0)
}


window.addEventListener("click" , (e) => {
  let target = e.target;
  if (target.classList.contains("_preview-project-image") ||
target.closest("._preview-project-image")) {
  let project = target.closest("._project");
let src = project.querySelector("img").src;
pcProjectImagePreview(true , src)
phoneImageView(true , src);
}
else if (target.classList.contains("_view-image")) {
    pcProjectImagePreview(false)
    phoneImageView(false);

  }
  else if (target.classList.contains("_social-trigger") || 
target.closest("._social-trigger")) {
let button = target.classList.contains("_social-trigger")
? target : target.closest("._social-trigger");
socialMenu(true , button.querySelector("modalhidden"));
}
else if (target.classList.contains("_social-modal")) {
  socialMenu(false)
}
  else if (target.classList.contains("_copy-value") || 
target.closest("._copy-value")) {
  let ele = target.classList.contains("_copy-value") ? 
target : target.closest("._copy-value");
  let copyValue = ele.getAttribute("data-value");
copyToClipboard(copyValue).then(() => {
  copyNotification(true , ele.getAttribute("data-message") , 2000)
}).catch(err => {
  
  copyNotification(true , "Failed to copy details" , 2000 , true)
  console.log(err)
})
}


})
function pcProjectImagePreview(state , img) {
  if (state) {
   let modal = document.querySelector(".pc-project-image-view");
modal.querySelector("img").src = img;
   modal.classList.add("pc-project-image-view--active");
   return;
  }
  
  let modal = document.querySelector(".pc-project-image-view");
  let modalMod = document.querySelector(".pc-project-image-view .modal");
  modal.classList.add("pc-project-image-view--deactive");
  // modal.classList.remove("pc-project-image-view--active");
  // modal.querySelector("img").src = "";
  setTimeout(() => {
    modal.classList.remove("pc-project-image-view--active")
    modal.classList.remove("pc-project-image-view--deactive")
    modal.querySelector("img").src = "";
  }, 400)
return;
}

function aggressiveScroll(scrollElement, scrollValue, time = 0) {
    if (time <= 0) {
        scrollElement.scrollTop = scrollValue;
        return () => {};
    }

    const startPos = scrollElement.scrollTop;
    const distance = scrollValue - startPos;
    const animDuration = Math.min(400, time);
    let startTime = null;
    let rafId = null;
    let animDone = false;

    const ease = (t) => 1 - Math.pow(1 - t, 3);

    // Hard-disable scrolling: nothing can move scrollTop but us
    const prevOverflow = scrollElement.style.overflow;
    const prevOverflowY = scrollElement.style.overflowY;
    scrollElement.style.overflow = "hidden";

    function tick(timestamp) {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;

        if (!animDone) {
            const t = Math.min(elapsed / animDuration, 1);
            scrollElement.scrollTop = startPos + distance * ease(t);
            if (t >= 1) animDone = true;
        } else {
            const diff = scrollValue - scrollElement.scrollTop;
            if (Math.abs(diff) > 0.5) {
                scrollElement.scrollTop += diff * 0.3;
            }
        }

        if (elapsed < time) {
            rafId = requestAnimationFrame(tick);
        }
    }
    rafId = requestAnimationFrame(tick);

    const timeoutId = setTimeout(unlock, time);

    function unlock() {
        clearTimeout(timeoutId);
        cancelAnimationFrame(rafId);
        scrollElement.style.overflow = prevOverflow;
        scrollElement.style.overflowY = prevOverflowY;
    }

    return unlock;
}


function getAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}



 
  
  function loadPhone() {
    let phoneHead = document.querySelector(".phone-head-bg");
    let phone = document.querySelector(".phone-head");
   createStarBackground(phoneHead) 
   createStarField(phoneHead) 
   createStarField(document.querySelector(".phone-about-bg")) 
   createStarBackground(document.querySelector(".phone-about-bg")) 
   let conts = document.querySelectorAll("._phone-about-cont");
   conts.forEach(c => {
     createStarBackground(c)
     createStarField(c)
    })
    let contact = document.querySelector(".phone-contact-star");
    createStarBackground(contact)
   phoneHead.style.opacity = "1"
   
   // loading welcome phases
   let welcomeContainer = document.querySelector(".phone-welcome");
   welcomeContainer.classList.add("phone-welcome--active")
   createStarBackground(phone) 
   createStarBackground(document.querySelector(".phone-proj-star-bg")) 
   
   
   setTimeout(() => {
phoneHead.querySelectorAll("canvas")[1].style.transition = " opacity 400ms"
phoneHead.querySelectorAll("canvas")[1].style.opacity = "0"
phone.classList.add("phone-hill--active")
setTimeout(() => {
document.querySelector(".phone-body").style.display = "contents"
}, 3000)
   }, 3000)
  }

  function socialMenu(state , element) {
if (state) {

  document.querySelectorAll("._social-modal")
  .forEach(s => {
    s.querySelector("._modal").innerHTML = element.innerHTML;

    s.classList.add("_social-modal--active")
  })
  return;
}
document.querySelectorAll("._social-modal")
  .forEach(s => {
    
    
    
    s.classList.add("_social-modal--deactive")
    setTimeout(() => {
      
      s.classList.remove("_social-modal--active")
      s.classList.remove("_social-modal--deactive")
      s.querySelector("._modal").innerHTML = "";
    }, 400)
  })
  }
  

  function phoneImageView(state , img) {
if (state) {

 let view =  document.querySelector(".phone-image-viewer");
 view.classList.remove("_social-modal--deactive")
 view.classList.add("_social-modal--active")
 view.querySelector("img").src = img;
  return;
}

let view =  document.querySelector(".phone-image-viewer");
    view.classList.add("_social-modal--deactive")
    setTimeout(() => {
      
      view.classList.remove("_social-modal--active")
      view.classList.remove("_social-modal--deactive")
      view.querySelector("img").src = ""
    }, 400)

  }

  function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    // 1. Modern async Clipboard API (Chrome 66+, Firefox 63+, Safari 13.1+)
    // Requires secure context (HTTPS or localhost)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(resolve).catch(() => {
        fallbackCopy(text, resolve, reject);
      });
      return;
    }
    // 2. Fallback for everything else (HTTP, old browsers, IE9+)
    fallbackCopy(text, resolve, reject);
  });
}

function fallbackCopy(text, resolve, reject) {
  const textarea = document.createElement('textarea');
  textarea.value = text;

  // Keep it out of view but still selectable/focusable
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.setAttribute('readonly', '');

  document.body.appendChild(textarea);

  // iOS Safari needs special selection handling
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    textarea.setSelectionRange(0, text.length);
  } else {
    textarea.select();
  }

  try {
    const success = document.execCommand('copy'); // deprecated but works IE9+
    document.body.removeChild(textarea);
    success ? resolve() : reject(new Error('execCommand copy failed'));
  } catch (err) {
    document.body.removeChild(textarea);
    reject(err);
  }
}

function copyNotification(state , message , duration , fail = false) {
  if (state && message && duration) {
    
   
    
if (!isNotificationAlive) {
isNotificationAlive = true;
    document.querySelectorAll("._copy-notification")
    .forEach(cn => {
      if (fail)
        cn.classList.add("_copy-notification--fail")
      else 
        cn.classList.remove("_copy-notification--fail")
        
      cn.querySelector("._message").textContent = message;
      cn.classList.add("_copy-notification--active")
      
      cn.querySelector("._progress").style.animation = ` notificationBar ${duration + 1200}ms forwards linear`
      let timerId;
     timerId = setTimeout(() => {
        copyNotification(false)
      isNotificationAlive = false;
      }, duration + 1200)
      
    })
  }
  
    

    return;
  }
  document.querySelectorAll("._copy-notification")
  .forEach(cn => {
    cn.classList.remove("_copy-notification--active")
    cn.classList.remove("_copy-notification--fail")
    setTimeout(() => {

      cn.querySelector("._progress").style.removeProperty("animation")
      cn.querySelector("._message").innerHTML = ""
    }, 600)
    
  })
  return;
  
}
