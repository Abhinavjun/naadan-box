document.addEventListener("DOMContentLoaded",()=>{

    const addressList=document.getElementById("addressList");
    const noAddresses=document.getElementById("noAddresses");
    const addressFormCard=document.getElementById("addressFormCard");
    const addressSectionCard=document.querySelector('[data-section="addresses"] .address-section-card');
    const addressForm=document.getElementById("addressForm");
    const addressFormTitle=document.getElementById("addressFormTitle");
    const addressId=document.getElementById("addressId");
    const btnAddAddress=document.getElementById("btnAddAddress");
    const btnAddFirstAddress=document.getElementById("btnAddFirstAddress");
    const btnCancelAddress=document.getElementById("btnCancelAddress");
    const addressCount=document.getElementById("addressCount");
    const toast=document.getElementById("toastNotification");
    const toastMessage=document.getElementById("toastMessage");
    const addressPincode=document.getElementById("addressPincode");
    const addressCity=document.getElementById("addressCity");
    const addressState=document.getElementById("addressState");
    const pincodeMessage=document.getElementById("pincodeMessage");
    const saveAddressModalElement=document.getElementById("saveAddressModal");
    const confirmSaveAddress=document.getElementById("confirmSaveAddress");

    const fullNameInput=document.getElementById("addressFullName");
    const phoneInput=document.getElementById("addressPhone");
    const addressLineInput=document.getElementById("addressLine");

    const fullNameError=document.getElementById("addressFullNameError");
    const phoneError=document.getElementById("addressPhoneError");
    const addressLineError=document.getElementById("addressLineError");
    const stateError=document.getElementById("addressStateError");

    let addresses=[];
    let pincodeVerified=false;
    let originalPincode="";

    function showToast(message){

        if(!toast||!toastMessage)return;

        toastMessage.textContent=message;
        toast.style.display="flex";

        setTimeout(()=>{
            toast.style.display="none";
        },2500);
    }

    // full name validation
    fullNameInput?.addEventListener("input",()=>{

        const value=fullNameInput.value.trim();

        if(!value){

            fullNameError.textContent="Full name is required.";

        }else if(value.length<3){

            fullNameError.textContent="Full name must be at least 3 characters.";

        }else if(!/^[A-Za-z ]+$/.test(value)){

            fullNameError.textContent="Please enter a valid name.";

        }else{

            fullNameError.textContent="";
        }
    });

    // phone validation
    phoneInput?.addEventListener("input",()=>{

        phoneInput.value=phoneInput.value.replace(/\D/g,"");

        const value=phoneInput.value.trim();

        if(!value){

            phoneError.textContent="Phone number is required.";

        }else if(value.length<10){

            phoneError.textContent="Phone number must contain 10 digits.";

        }else{

            phoneError.textContent="";
        }
    });

    // address validation
    addressLineInput?.addEventListener("input",()=>{

        const value=addressLineInput.value.trim();

        if(!value){

            addressLineError.textContent="Address is required.";

        }else if(value.length<5){

            addressLineError.textContent="Address must be at least 5 characters.";

        }else{

            addressLineError.textContent="";
        }
    });

    // state validation
    addressState?.addEventListener("change",()=>{

        if(!addressState.value){

            stateError.textContent="Please select a state.";

        }else{

            stateError.textContent="";
        }
    });

    function resetForm(){

        addressForm.reset();
        addressId.value="";
        addressCity.value="";
        pincodeMessage.textContent="";
        pincodeVerified=false;
        originalPincode="";
        addressFormTitle.textContent="Add New Address";

        fullNameError.textContent="";
        phoneError.textContent="";
        addressLineError.textContent="";
        stateError.textContent="";
    }

    function openAddForm(){

        resetForm();

        if(addressSectionCard){
            addressSectionCard.classList.add("d-none");
        }

        addressFormCard.classList.remove("d-none");

        addressFormCard.scrollIntoView({
            behavior:"smooth",
            block:"start"
        });
    }

    function closeForm(){

        addressFormCard.classList.add("d-none");

        if(addressSectionCard){
            addressSectionCard.classList.remove("d-none");
        }

        resetForm();
    }

    function escapeHTML(value){

        const div=document.createElement("div");

        div.textContent=value||"";

        return div.innerHTML;
    }

    function renderAddresses(){

        addressList.innerHTML="";
        addressCount.textContent=addresses.length;

        if(!addresses.length){

            noAddresses.classList.remove("d-none");

            return;
        }

        noAddresses.classList.add("d-none");

        addresses.forEach(address=>{

            const card=document.createElement("div");

            card.className="border rounded-3 p-4 mb-3";
            card.style.background="var(--card-background)";

            card.innerHTML=`
                <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">

                    <div>

                        <div class="d-flex align-items-center gap-2 mb-2">

                            <h5 class="mb-0 fw-bold">
                                ${escapeHTML(address.fullName)}
                            </h5>

                            <span class="badge text-bg-light border">
                                ${escapeHTML(address.addressType)}
                            </span>

                            ${address.isDefault
                                ?'<span class="badge" style="background:var(--brand-primary-green);">Default</span>'
                                :""
                            }

                        </div>

                        <p class="mb-1">
                            ${escapeHTML(address.phone)}
                        </p>

                        <p class="mb-1">
                            ${escapeHTML(address.addressLine)}
                        </p>

                        <p class="mb-1">
                            ${escapeHTML(address.city)},
                            ${escapeHTML(address.state)}
                            -
                            ${escapeHTML(address.pincode)}
                        </p>

                        ${address.landmark
                            ?`<p class="mb-0 text-muted">
                                Landmark: ${escapeHTML(address.landmark)}
                              </p>`
                            :""
                        }

                    </div>

                    <div class="d-flex gap-2">

                        <button
                            type="button"
                            class="btn btn-profile-outline btn-sm edit-address"
                            data-id="${address._id}">
                            <i class="bi bi-pencil me-1"></i>
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-danger btn-sm delete-address"
                            data-id="${address._id}">
                            <i class="bi bi-trash me-1"></i>
                            Delete
                        </button>

                    </div>

                </div>
            `;

            addressList.appendChild(card);
        });

        document.querySelectorAll(".edit-address").forEach(button=>{

            button.addEventListener("click",()=>{

                const address=addresses.find(
                    item=>item._id===button.dataset.id
                );

                if(address){

                    openEditForm(address);
                }
            });
        });

        document.querySelectorAll(".delete-address").forEach(button=>{

            button.addEventListener("click",()=>{

                deleteAddress(button.dataset.id);
            });
        });
    }

    async function loadAddresses(){

        try{

            const response=await fetch("/profile/addresses",{

                headers:{
                    "Accept":"application/json"
                }
            });

            const data=await response.json();

            if(response.status===403&&data.code==="USER_BLOCKED"){

                const modalElement=document.getElementById(
                    "customBlockedUserPopup"
                );

                const logoutButton=document.getElementById(
                    "customBlockedLogoutButton"
                );

                if(modalElement){

                    document.body.appendChild(modalElement);

                    modalElement.classList.add("show");
                }

                if(logoutButton){

                    logoutButton.onclick=()=>{

                        window.location.href="/login";
                    };
                }

                return;
            }

            if(!response.ok||!data.success){

                showToast(
                    data.message||"Unable to load addresses."
                );

                return;
            }

            addresses=data.addresses||[];

            renderAddresses();

        }catch(error){

            console.error(
                "Load addresses error:",
                error
            );

            showToast("Unable to load addresses.");
        }
    }

    function openEditForm(address){

        addressFormTitle.textContent="Edit Address";

        addressId.value=address._id;

        fullNameInput.value=address.fullName||"";
        phoneInput.value=address.phone||"";
        addressLineInput.value=address.addressLine||"";

        addressCity.value=address.city||"";
        addressState.value=address.state||"";
        addressPincode.value=address.pincode||"";

        document.getElementById("addressLandmark").value=
            address.landmark||"";

        document.getElementById("addressType").value=
            address.addressType||"Home";

        document.getElementById("addressDefault").checked=
            address.isDefault;

        fullNameError.textContent="";
        phoneError.textContent="";
        addressLineError.textContent="";
        stateError.textContent="";

        originalPincode=address.pincode||"";

        pincodeVerified=true;

        pincodeMessage.textContent="PIN already verified.";

        if(addressSectionCard){
            addressSectionCard.classList.add("d-none");
        }

        addressFormCard.classList.remove("d-none");

        addressFormCard.scrollIntoView({
            behavior:"smooth",
            block:"start"
        });
    }

    async function verifyPincode(){

        const pincode=addressPincode.value.trim();

        pincodeVerified=false;
        addressCity.value="";
        pincodeMessage.textContent="";

        if(!/^\d{6}$/.test(pincode)){

            return;
        }

        pincodeMessage.textContent="Verifying PIN code...";

        try{

            const response=await fetch(
                `/profile/address/pincode/${pincode}`
            );

            const data=await response.json();

            if(response.status===403&&data.code==="USER_BLOCKED"){

                const modalElement=document.getElementById(
                    "customBlockedUserPopup"
                );

                const logoutButton=document.getElementById(
                    "customBlockedLogoutButton"
                );

                if(modalElement){

                    document.body.appendChild(modalElement);

                    modalElement.classList.add("show");
                }

                if(logoutButton){

                    logoutButton.onclick=()=>{

                        window.location.href="/login";
                    };
                }

                return;
            }

            if(!response.ok||!data.success){

                pincodeMessage.textContent=
                    data.message||"Invalid PIN code.";

                return;
            }

            addressCity.value=data.city;

            if(
                addressState.value &&
                addressState.value.toLowerCase()!==data.state.toLowerCase()
            ){

                pincodeMessage.textContent=
                    `This PIN code belongs to ${data.state}.`;

                addressState.value="";

                stateError.textContent=
                    `Please select ${data.state}.`;

                return;
            }

            pincodeVerified=true;
            originalPincode=pincode;

            pincodeMessage.textContent=
                `PIN verified — ${data.city}, ${data.state}`;

        }catch(error){

            console.error(
                "Pincode verification error:",
                error
            );

            pincodeMessage.textContent=
                "Unable to verify PIN code.";
        }
    }

    async function deleteAddress(id){

        const modalElement=document.getElementById(
            "deleteAddressModal"
        );

        const confirmButton=document.getElementById(
            "confirmDeleteAddress"
        );

        if(!modalElement||!confirmButton){

            console.error(
                "Delete confirmation modal not found."
            );

            return;
        }

        const modal=new bootstrap.Modal(modalElement);

        confirmButton.onclick=async()=>{

            modal.hide();

            try{

                const response=await fetch(
                    `/profile/address/${id}`,
                    {
                        method:"DELETE",

                        headers:{
                            "Accept":"application/json"
                        }
                    }
                );

                const data=await response.json();

                if(
                    response.status===403 &&
                    data.code==="USER_BLOCKED"
                ){

                    const blockedModal=document.getElementById(
                        "customBlockedUserPopup"
                    );

                    const logoutButton=document.getElementById(
                        "customBlockedLogoutButton"
                    );

                    if(blockedModal){

                        document.body.appendChild(blockedModal);

                        blockedModal.classList.add("show");
                    }

                    if(logoutButton){

                        logoutButton.onclick=()=>{

                            window.location.href="/login";
                        };
                    }

                    return;
                }

                if(!response.ok||!data.success){

                    showToast(
                        data.message||"Unable to delete address."
                    );

                    return;
                }

                showToast(
                    "Address deleted successfully."
                );

                await loadAddresses();

            }catch(error){

                console.error(
                    "Delete address error:",
                    error
                );

                showToast(
                    "Unable to delete address."
                );
            }
        };

        modal.show();
    }

    addressPincode.addEventListener("input",()=>{

        const pincode=addressPincode.value.trim();

        if(pincode!==originalPincode){

            pincodeVerified=false;
        }

        if(pincode.length===6){

            verifyPincode();

        }else{

            pincodeVerified=false;
            addressCity.value="";
            pincodeMessage.textContent="";
        }
    });

    addressState.addEventListener("change",()=>{

        if(!addressState.value){

            stateError.textContent=
                "Please select a state.";

            return;
        }

        stateError.textContent="";

        if(addressPincode.value.trim().length===6){

            verifyPincode();
        }
    });

    addressForm.addEventListener("submit",async event=>{

        event.preventDefault();

        const data={

            fullName:fullNameInput.value.trim(),

            phone:phoneInput.value.trim(),

            addressLine:addressLineInput.value.trim(),

            city:addressCity.value.trim(),

            state:addressState.value,

            pincode:addressPincode.value.trim(),

            landmark:document.getElementById(
                "addressLandmark"
            ).value.trim(),

            addressType:document.getElementById(
                "addressType"
            ).value,

            isDefault:document.getElementById(
                "addressDefault"
            ).checked
        };

        // full name validation
        if(!data.fullName){

            fullNameError.textContent=
                "Full name is required.";

            return;
        }

        if(data.fullName.length<3){

            fullNameError.textContent=
                "Full name must be at least 3 characters.";

            return;
        }

        if(!/^[A-Za-z ]+$/.test(data.fullName)){

            fullNameError.textContent=
                "Please enter a valid name.";

            return;
        }

        fullNameError.textContent="";

        // phone validation
        if(!data.phone){

            phoneError.textContent=
                "Phone number is required.";

            return;
        }

        if(!/^\d{10}$/.test(data.phone)){

            phoneError.textContent=
                "Phone number must contain exactly 10 digits.";

            return;
        }

        phoneError.textContent="";

        // address validation
        if(!data.addressLine){

            addressLineError.textContent=
                "Address is required.";

            return;
        }

        if(data.addressLine.length<5){

            addressLineError.textContent=
                "Address must be at least 5 characters.";

            return;
        }

        addressLineError.textContent="";

        // state validation
        if(!data.state){

            stateError.textContent=
                "Please select a state.";

            return;
        }

        stateError.textContent="";

        // pin validation
        if(!/^\d{6}$/.test(data.pincode)){

            pincodeMessage.textContent=
                "Enter a valid 6-digit PIN code.";

            return;
        }

        if(!pincodeVerified){

            pincodeMessage.textContent=
                "Please verify your PIN code before saving.";

            return;
        }

        if(!saveAddressModalElement||!confirmSaveAddress){

            console.error(
                "Save confirmation modal not found."
            );

            return;
        }

        const saveModal=new bootstrap.Modal(
            saveAddressModalElement
        );

        confirmSaveAddress.onclick=async()=>{

            saveModal.hide();

            confirmSaveAddress.disabled=true;

            try{

                const id=addressId.value;

                const response=await fetch(

                    id
                        ?`/profile/address/${id}`
                        :"/profile/address",

                    {
                        method:id?"PUT":"POST",

                        headers:{
                            "Content-Type":"application/json",
                            "Accept":"application/json"
                        },

                        body:JSON.stringify(data)
                    }
                );

                const result=await response.json();

                if(
                    response.status===403 &&
                    result.code==="USER_BLOCKED"
                ){

                    const modalElement=document.getElementById(
                        "customBlockedUserPopup"
                    );

                    const logoutButton=document.getElementById(
                        "customBlockedLogoutButton"
                    );

                    if(modalElement){

                        document.body.appendChild(modalElement);

                        modalElement.classList.add("show");
                    }

                    if(logoutButton){

                        logoutButton.onclick=()=>{

                            window.location.href="/login";
                        };
                    }

                    return;
                }

                if(!response.ok||!result.success){

                    showToast(
                        result.message||
                        "Unable to save address."
                    );

                    return;
                }

                showToast(
                    id
                        ?"Address updated successfully."
                        :"Address added successfully."
                );

                closeForm();

                await loadAddresses();

            }catch(error){

                console.error(
                    "Save address error:",
                    error
                );

                showToast(
                    "Unable to save address."
                );

            }finally{

                confirmSaveAddress.disabled=false;
            }
        };

        saveModal.show();
    });

    btnAddAddress?.addEventListener(
        "click",
        openAddForm
    );

    btnAddFirstAddress?.addEventListener(
        "click",
        openAddForm
    );

    btnCancelAddress?.addEventListener(
        "click",
        closeForm
    );

    loadAddresses();
});