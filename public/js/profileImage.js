// # PROFILE IMAGE SETUP
document.addEventListener("DOMContentLoaded", () => {
    const imageInput = document.getElementById("profileImageInput");
    const imagePreview = document.getElementById("profileImagePreview");
    const imageActions = document.querySelector(".profile-image-actions");

    const deleteModal = document.getElementById("deleteImageConfirmModal");
    const cancelDelete = document.getElementById("cancelDeleteImage");
    const confirmDelete = document.getElementById("confirmDeleteImage");

    const cropModal = document.getElementById("profileCropModal");
    const cropImage = document.getElementById("cropImage");
    const closeCropModalButton = document.getElementById("closeCropModal");
    const cancelCropButton = document.getElementById("cancelCrop");
    const saveCroppedImageButton = document.getElementById("saveCroppedImage");
    const resetCropButton = document.getElementById("resetCrop");
    const cropZoom = document.getElementById("cropZoom");

    if (!imageInput || !imagePreview) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const maxFileSize = 2 * 1024 * 1024;

    let cropper = null;
    let selectedFile = null;
    let imageObjectUrl = null;

    // # SHOW MESSAGE
    const showMessage = message => {
        const toast = document.getElementById("toastNotification");
        const toastMessage = document.getElementById("toastMessage");

        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        toast.style.display = "flex";

        setTimeout(() => {
            toast.style.display = "none";
        }, 2500);
    };

    // # OPEN CROP MODAL
    const openCropModal = file => {
        if (!cropModal || !cropImage) return;

        selectedFile = file;

        if (imageObjectUrl) {
            URL.revokeObjectURL(imageObjectUrl);
        }

        imageObjectUrl = URL.createObjectURL(file);

        cropImage.src = imageObjectUrl;

        cropModal.classList.add("show");

        document.body.classList.add("crop-modal-open");

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        cropImage.onload = () => {
            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 0.85,
                responsive: true,
                restore: false,
                guides: false,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false
            });

            if (cropZoom) {
                cropZoom.value = 0;
            }
        };
    };

    // # CLOSE CROP MODAL
    const closeCropModal = () => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        if (imageObjectUrl) {
            URL.revokeObjectURL(imageObjectUrl);
            imageObjectUrl = null;
        }

        selectedFile = null;

        cropModal?.classList.remove("show");
        document.body.classList.remove("crop-modal-open");

        imageInput.value = "";

        if (cropZoom) {
            cropZoom.value = 0;
        }
    };

    // # SELECT IMAGE
    imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];

        if (!file) return;

        if (!allowedTypes.includes(file.type)) {
            showMessage(
                "Only JPG, JPEG, PNG and WebP images are allowed."
            );

            imageInput.value = "";
            return;
        }

        if (file.size > maxFileSize) {
            showMessage("Image size must not exceed 2 MB.");
            imageInput.value = "";
            return;
        }

        openCropModal(file);
    });

    // # ZOOM
    cropZoom?.addEventListener("input", () => {
        if (!cropper) return;

        const value = Number(cropZoom.value);

        cropper.zoomTo(value / 100);
    });

    // # RESET CROP
    resetCropButton?.addEventListener("click", () => {
        if (!cropper) return;

        cropper.reset();

        if (cropZoom) {
            cropZoom.value = 0;
        }
    });

    // # CANCEL CROP
    cancelCropButton?.addEventListener("click", closeCropModal);
    closeCropModalButton?.addEventListener("click", closeCropModal);

    cropModal?.addEventListener("click", event => {
        if (event.target.classList.contains("profile-crop-overlay")) {
            closeCropModal();
        }
    });

    // # SAVE CROPPED IMAGE
    saveCroppedImageButton?.addEventListener("click", async () => {
        if (!cropper || !selectedFile) return;

        if (saveCroppedImageButton.disabled) return;

        saveCroppedImageButton.disabled = true;
        saveCroppedImageButton.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            const canvas = cropper.getCroppedCanvas({
                width: 600,
                height: 600,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: "high"
            });

            if (!canvas) {
                throw new Error("Unable to crop the image.");
            }

            const blob = await new Promise(resolve => {
                canvas.toBlob(
                    resolve,
                    "image/jpeg",
                    0.9
                );
            });

            if (!blob) {
                throw new Error("Unable to process the cropped image.");
            }

            const formData = new FormData();

            formData.append(
                "profileImage",
                blob,
                "profile-image.jpg"
            );

            const response = await fetch("/profile/image", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to update profile image."
                );
            }

            imagePreview.src =
                `/uploads/${data.profileImage}?t=${Date.now()}`;

            updateImageButtons(data.profileImage);

            closeCropModal();

            showMessage(
                "Profile image updated successfully."
            );

        } catch (error) {
            console.error(
                "Profile image upload error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to update profile image."
            );

        } finally {
            saveCroppedImageButton.disabled = false;

            saveCroppedImageButton.innerHTML =
                '<i class="bi bi-check2"></i> Crop & Save';
        }
    });

    // # UPDATE IMAGE BUTTONS
    function updateImageButtons(profileImage) {
        if (!imageActions) return;

        const isGoogleImage =
            profileImage &&
            profileImage.startsWith("http");

        const hasCustomImage =
            profileImage &&
            profileImage !== "default-profile.png" &&
            !isGoogleImage;

        imageActions.innerHTML = `
            <label
                for="profileImageInput"
                class="profile-image-btn"
            >
                <i class="bi bi-camera"></i>
                <span>
                    ${hasCustomImage ? "Change Photo" : "Add Photo"}
                </span>
            </label>

            ${hasCustomImage ? `
                <button
                    type="button"
                    id="deleteProfileImage"
                    class="profile-image-delete"
                    title="Delete profile photo"
                    aria-label="Delete profile photo"
                >
                    <i class="bi bi-trash3"></i>
                </button>
            ` : ""}
        `;
    }

    // # OPEN DELETE POPUP
    imageActions?.addEventListener("click", event => {
        const deleteButton =
            event.target.closest("#deleteProfileImage");

        if (!deleteButton) return;

        event.preventDefault();

        openDeletePopup();
    });

    function openDeletePopup() {
        if (!deleteModal) return;

        deleteModal.classList.add("show");
    }

    function closeDeletePopup() {
        if (!deleteModal) return;

        deleteModal.classList.remove("show");
    }

    // # CANCEL DELETE
    cancelDelete?.addEventListener(
        "click",
        closeDeletePopup
    );

    deleteModal?.addEventListener("click", event => {
        if (event.target === deleteModal) {
            closeDeletePopup();
        }
    });

    // # DELETE IMAGE
    confirmDelete?.addEventListener("click", async () => {
        if (confirmDelete.disabled) return;

        confirmDelete.disabled = true;
        cancelDelete.disabled = true;

        confirmDelete.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';

        try {
            const response = await fetch(
                "/profile/image",
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to delete profile image."
                );
            }

            if (
                data.profileImage ===
                "default-profile.png"
            ) {
                imagePreview.src =
                    `/uploads/default-profile.png?t=${Date.now()}`;

            } else if (
                data.profileImage.startsWith("http")
            ) {
                imagePreview.src =
                    data.profileImage;

            } else {
                imagePreview.src =
                    `/uploads/${data.profileImage}?t=${Date.now()}`;
            }

            updateImageButtons(data.profileImage);

            closeDeletePopup();

            showMessage(
                "Profile image deleted successfully."
            );

        } catch (error) {
            console.error(
                "Profile image delete error:",
                error
            );

            closeDeletePopup();

            showMessage(
                error.message ||
                "Unable to delete profile image."
            );

        } finally {
            confirmDelete.disabled = false;
            cancelDelete.disabled = false;

            confirmDelete.innerHTML = "Delete";
        }
    });
});