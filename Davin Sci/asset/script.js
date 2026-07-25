/*=============================
    LOADER
=============================*/
window.addEventListener("load", () => {
    const loader = document.getElementById("loader");
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = "0";
            loader.style.visibility = "hidden";
        }, 500);
    }
});

/*=============================
    SIDEBAR ACTIVE STATE + BREADCRUMB
    (based on data-page set on <body>)
=============================*/
const currentPage = document.body.dataset.page || "home";
const fileLinks = document.querySelectorAll(".filetree .file");
fileLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.page === currentPage);
});

const breadcrumbCurrent = document.querySelector(".breadcrumb .current");
if (breadcrumbCurrent) {
    const active = document.querySelector(".filetree .file.active");
    if (active) {
        breadcrumbCurrent.textContent = active.textContent.trim();
    }
}

/*=============================
    MOBILE SIDEBAR (hamburger)
=============================*/
const hamburger = document.getElementById("hamburger");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

function closeSidebar() {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
}

if (hamburger && sidebar && overlay) {
    hamburger.onclick = () => {
        sidebar.classList.toggle("show");
        overlay.classList.toggle("show");
    };
    overlay.onclick = closeSidebar;
    document.querySelectorAll(".filetree .file").forEach(link => {
        link.addEventListener("click", closeSidebar);
    });
}

/*=============================
    TYPING TEXT (home only)
=============================*/
const typing = document.getElementById("typing");
if (typing) {
    const text = ["Web Developer", "Fullstack Developer", "UI Designer", "Cyber Security Enthusiast"];
    let word = 0,
        char = 0,
        hapus = false;

    function ketik() {
        const current = text[word];
        if (!hapus) {
            typing.textContent = current.substring(0, char++);
            if (char > current.length) {
                hapus = true;
                setTimeout(ketik, 1500);
                return;
            }
        } else {
            typing.textContent = current.substring(0, char--);
            if (char < 0) {
                hapus = false;
                word++;
                if (word >= text.length) word = 0;
            }
        }
        setTimeout(ketik, hapus ? 60 : 120);
    }
    ketik();
}

/*=============================
    BACK TO TOP
=============================*/
const topButton = document.getElementById("topButton");
if (topButton) {
    window.addEventListener("scroll", () => {
        topButton.style.display = window.scrollY > 300 ? "flex" : "none";
    });
    topButton.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
}

/*=============================
    PROFILE PHOTO (home only)
=============================*/
const profileInput = document.getElementById("profileInput");
const uploadProfile = document.getElementById("uploadProfile");
const deleteProfile = document.getElementById("deleteProfile");
const profilePreview = document.getElementById("profilePreview");

const savedPhoto = localStorage.getItem("profilePhoto");
if (savedPhoto && profilePreview) {
    profilePreview.src = savedPhoto;
}

if (uploadProfile) {
    uploadProfile.onclick = () => profileInput.click();
}

if (profileInput) {
    profileInput.addEventListener("change", () => {
        const file = profileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePreview.src = e.target.result;
            localStorage.setItem("profilePhoto", e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

if (deleteProfile) {
    deleteProfile.onclick = () => {
        localStorage.removeItem("profilePhoto");
        profilePreview.src = "asset/profile/default.png";
    };
}

/*=============================
    SCROLL REVEAL
=============================*/
function reveal() {
    const item = document.querySelectorAll(".about-card,.skill-card,.project-card,.timeline-item");
    item.forEach(card => {
        const top = card.getBoundingClientRect().top;
        const visible = window.innerHeight - 100;
        if (top < visible) card.classList.add("show");
    });
}
window.addEventListener("scroll", reveal);
reveal();

/*====================================
    CRUD PROJECT
=====================================*/
const projectModal = document.getElementById("projectModal");
const addProject = document.getElementById("addProject");
const closeProject = document.getElementById("closeProject");
const saveProject = document.getElementById("saveProject");

const projectTitle = document.getElementById("projectTitle");
const projectDesc = document.getElementById("projectDesc");
const projectGithub = document.getElementById("projectGithub");
const projectImage = document.getElementById("projectImage");

const projectContainer = document.getElementById("projectContainer");
let projectList = JSON.parse(localStorage.getItem("projects")) || [];

if (addProject) addProject.onclick = () => { projectModal.style.display = "flex"; };
if (closeProject) closeProject.onclick = () => { projectModal.style.display = "none"; };
if (projectModal) {
    window.addEventListener("click", (e) => {
        if (e.target === projectModal) projectModal.style.display = "none";
    });
}

if (saveProject) {
    saveProject.onclick = () => {
        if (projectTitle.value.trim() === "" || projectDesc.value.trim() === "") {
            alert("Judul dan deskripsi wajib diisi.");
            return;
        }
        const file = projectImage.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => tambahProject(e.target.result);
            reader.readAsDataURL(file);
        } else {
            tambahProject("");
        }
    };
}

function tambahProject(gambar) {
    projectList.push({
        id: Date.now(),
        title: projectTitle.value,
        desc: projectDesc.value,
        github: projectGithub.value,
        image: gambar
    });
    simpanProject();
}

function simpanProject() {
    localStorage.setItem("projects", JSON.stringify(projectList));
    renderProject();
    resetProjectForm();
}

function resetProjectForm() {
    projectTitle.value = "";
    projectDesc.value = "";
    projectGithub.value = "";
    projectImage.value = "";
    projectModal.style.display = "none";
}

function hapusProject(id) {
    if (!confirm("Hapus project ini?")) return;
    projectList = projectList.filter(item => item.id !== id);
    localStorage.setItem("projects", JSON.stringify(projectList));
    renderProject();
}

function renderProject() {
    if (!projectContainer) return;
    projectContainer.innerHTML = "";
    if (projectList.length === 0) {
        projectContainer.innerHTML = `<div class="empty-state">$ ls projects/<br>-- direktori kosong --</div>`;
        return;
    }
    projectList.forEach(project => {
                projectContainer.innerHTML += `
        <div class="project-card">
            ${project.image ? `<img src="${project.image}" alt="">` : `<div class="no-image">// tidak ada gambar</div>`}
            <div class="project-content">
                <h3>${project.title}</h3>
                <p>${project.desc}</p>
                <div class="project-button">
                    ${project.github ? `<a href="${project.github}" target="_blank" class="btn secondary">Github</a>` : ""}
                    <button class="btn danger" onclick="hapusProject(${project.id})">Hapus</button>
                </div>
            </div>
        </div>`;
    });
    reveal();
}
renderProject();

/*====================================
    CRUD PENGALAMAN PKL
====================================*/
const experienceModal = document.getElementById("experienceModal");
const addExperience = document.getElementById("addExperience");
const closeExperience = document.getElementById("closeExperience");
const saveExperience = document.getElementById("saveExperience");

const expCompany = document.getElementById("expCompany");
const expPosition = document.getElementById("expPosition");
const expYear = document.getElementById("expYear");
const expDesc = document.getElementById("expDesc");

const experienceContainer = document.getElementById("experienceContainer");
let experiences = JSON.parse(localStorage.getItem("experiences")) || [];

if (addExperience) addExperience.onclick = () => { experienceModal.style.display = "flex"; };
if (closeExperience) closeExperience.onclick = () => { experienceModal.style.display = "none"; };
if (experienceModal) {
    window.addEventListener("click", (e) => {
        if (e.target === experienceModal) experienceModal.style.display = "none";
    });
}

if (saveExperience) {
    saveExperience.onclick = () => {
        if (expCompany.value.trim() === "" || expPosition.value.trim() === "") {
            alert("Lengkapi data.");
            return;
        }
        experiences.push({
            id: Date.now(),
            company: expCompany.value,
            position: expPosition.value,
            year: expYear.value,
            desc: expDesc.value
        });
        localStorage.setItem("experiences", JSON.stringify(experiences));
        renderExperience();
        experienceModal.style.display = "none";
        expCompany.value = ""; expPosition.value = ""; expYear.value = ""; expDesc.value = "";
    };
}

function deleteExperience(id) {
    if (!confirm("Hapus pengalaman ini?")) return;
    experiences = experiences.filter(item => item.id != id);
    localStorage.setItem("experiences", JSON.stringify(experiences));
    renderExperience();
}

function renderExperience() {
    if (!experienceContainer) return;
    experienceContainer.innerHTML = "";
    if (experiences.length === 0) {
        experienceContainer.innerHTML = `<div class="empty-state">$ cat experience.log<br>-- belum ada entri --</div>`;
        return;
    }
    experiences.forEach(item => {
        experienceContainer.innerHTML += `
        <div class="timeline-item">
            <h3>${item.company}</h3>
            <small>${item.position} | ${item.year}</small>
            <p>${item.desc}</p>
            <div class="timeline-actions"><button class="btn danger" onclick="deleteExperience(${item.id})">Hapus</button></div>
        </div>`;
    });
    reveal();
}
renderExperience();

/*====================================
    CRUD ORGANISASI
====================================*/
const organizationModal = document.getElementById("organizationModal");
const addOrganization = document.getElementById("addOrganization");
const closeOrganization = document.getElementById("closeOrganization");
const saveOrganization = document.getElementById("saveOrganization");

const orgName = document.getElementById("orgName");
const orgPosition = document.getElementById("orgPosition");
const orgYear = document.getElementById("orgYear");
const orgDesc = document.getElementById("orgDesc");

const organizationContainer = document.getElementById("organizationContainer");
let organizations = JSON.parse(localStorage.getItem("organizations")) || [];

if (addOrganization) addOrganization.onclick = () => { organizationModal.style.display = "flex"; };
if (closeOrganization) closeOrganization.onclick = () => { organizationModal.style.display = "none"; };
if (organizationModal) {
    window.addEventListener("click", (e) => {
        if (e.target === organizationModal) organizationModal.style.display = "none";
    });
}

if (saveOrganization) {
    saveOrganization.onclick = () => {
        if (orgName.value.trim() === "" || orgPosition.value.trim() === "") {
            alert("Lengkapi data.");
            return;
        }
        organizations.push({
            id: Date.now(),
            name: orgName.value,
            position: orgPosition.value,
            year: orgYear.value,
            desc: orgDesc.value
        });
        localStorage.setItem("organizations", JSON.stringify(organizations));
        renderOrganization();
        organizationModal.style.display = "none";
        orgName.value = ""; orgPosition.value = ""; orgYear.value = ""; orgDesc.value = "";
    };
}

function deleteOrganization(id) {
    if (!confirm("Hapus organisasi ini?")) return;
    organizations = organizations.filter(x => x.id != id);
    localStorage.setItem("organizations", JSON.stringify(organizations));
    renderOrganization();
}

function renderOrganization() {
    if (!organizationContainer) return;
    organizationContainer.innerHTML = "";
    if (organizations.length === 0) {
        organizationContainer.innerHTML = `<div class="empty-state">$ cat organization.log<br>-- belum ada entri --</div>`;
        return;
    }
    organizations.forEach(item => {
        organizationContainer.innerHTML += `
        <div class="timeline-item">
            <h3>${item.name}</h3>
            <small>${item.position} | ${item.year}</small>
            <p>${item.desc}</p>
            <div class="timeline-actions"><button class="btn danger" onclick="deleteOrganization(${item.id})">Hapus</button></div>
        </div>`;
    });
    reveal();
}
renderOrganization();

/*====================================
    CRUD PENDIDIKAN
====================================*/
const educationModal = document.getElementById("educationModal");
const addEducation = document.getElementById("addEducation");
const closeEducation = document.getElementById("closeEducation");
const saveEducation = document.getElementById("saveEducation");

const eduSchool = document.getElementById("eduSchool");
const eduMajor = document.getElementById("eduMajor");
const eduYear = document.getElementById("eduYear");

const educationContainer = document.getElementById("educationContainer");
let educations = JSON.parse(localStorage.getItem("educations")) || [];

if (addEducation) addEducation.onclick = () => { educationModal.style.display = "flex"; };
if (closeEducation) closeEducation.onclick = () => { educationModal.style.display = "none"; };
if (educationModal) {
    window.addEventListener("click", (e) => {
        if (e.target === educationModal) educationModal.style.display = "none";
    });
}

if (saveEducation) {
    saveEducation.onclick = () => {
        if (eduSchool.value.trim() === "") {
            alert("Lengkapi data.");
            return;
        }
        educations.push({
            id: Date.now(),
            school: eduSchool.value,
            major: eduMajor.value,
            year: eduYear.value
        });
        localStorage.setItem("educations", JSON.stringify(educations));
        renderEducation();
        educationModal.style.display = "none";
        eduSchool.value = ""; eduMajor.value = ""; eduYear.value = "";
    };
}

function deleteEducation(id) {
    if (!confirm("Hapus riwayat pendidikan ini?")) return;
    educations = educations.filter(x => x.id != id);
    localStorage.setItem("educations", JSON.stringify(educations));
    renderEducation();
}

function renderEducation() {
    if (!educationContainer) return;
    educationContainer.innerHTML = "";
    if (educations.length === 0) {
        educationContainer.innerHTML = `<div class="empty-state">$ cat education.log<br>-- belum ada entri --</div>`;
        return;
    }
    educations.forEach(item => {
        educationContainer.innerHTML += `
        <div class="timeline-item">
            <h3>${item.school}</h3>
            <small>${item.major}</small>
            <p>${item.year}</p>
            <div class="timeline-actions"><button class="btn danger" onclick="deleteEducation(${item.id})">Hapus</button></div>
        </div>`;
    });
    reveal();
}
renderEducation();

/*====================================
    CONTACT (save to localStorage)
====================================*/
const saveContact = document.getElementById("saveContact");
const contactFields = ["email", "whatsapp", "instagram", "github", "linkedin", "address"];

const savedContact = JSON.parse(localStorage.getItem("contact")) || {};
contactFields.forEach(id => {
    const el = document.getElementById(id);
    if (el && savedContact[id]) el.value = savedContact[id];
});

if (saveContact) {
    saveContact.onclick = () => {
        const data = {};
        contactFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) data[id] = el.value;
        });
        localStorage.setItem("contact", JSON.stringify(data));
        alert("Kontak tersimpan.");
    };
}