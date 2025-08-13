
    var accessToken;
    var framedImageBlob;

    // Initialize Facebook SDK
    window.fbAsyncInit = function() {
        FB.init({
            appId: '3977326002532530', // Replace with your App ID
            status: true,
            cookie: true,
            oauth: true,
            xfbml: true
        });

        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                accessToken = response.authResponse.accessToken;
                console.log('User is logged in');
            } else {
                FB.login(function(response) {
                    if (response.status === 'connected') {
                        accessToken = response.authResponse.accessToken;
                        console.log('User logged in successfully');
                    } else {
                        alert('Login failed or was canceled.');
                    }
                }, { scope: 'user_photos,publish_to_groups' });
            }
        });
    };

    // Preview image with frame
    function previewImage() {
        const input = document.getElementById('photo-input');
        const canvas = document.getElementById('preview-canvas');
        const ctx = canvas.getContext('2d');

        if (!input.files || !input.files[0]) {
            alert('Please select an image.');
            return;
        }

        const userImage = new Image();
        const frameImage = new Image();
        frameImage.src = 'frame.png'; // Replace with your frame image URL

        userImage.onload = function() {
            // Resize canvas to match user image or frame (adjust as needed)
            /*canvas.width = userImage.width;
            canvas.height = userImage.height;*/

            // Draw user image
            ctx.drawImage(userImage, 0, 0, canvas.width, canvas.height);

            // Draw frame on top
            frameImage.onload = function() {
                ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

                // Save the framed image as a Blob
                canvas.toBlob(function(blob) {
                    framedImageBlob = blob;
                }, 'image/jpeg', 0.9);
            };
        };
        userImage.src = URL.createObjectURL(input.files[0]);
    }

    // Upload framed image to Facebook
    function uploadToFacebook() {
        if (!framedImageBlob) {
            alert('Please select and preview an image first.');
            return;
        }

        // Get user's albums
        FB.api('/me/albums', function(response) {
            if (response && !response.error) {
                var album = response.data.find(album => album.name === 'Profile Pictures') || response.data[0];
                var albumId = album.id;

                // Create FormData for upload
                var formData = new FormData();
                formData.append('source', framedImageBlob, 'framed_image.jpg');
                formData.append('access_token', accessToken);

                // Upload to album
                FB.api(
                    '/' + albumId + '/photos',
                    'POST',
                    formData,
                    function(response) {
                        if (!response || response.error) {
                            alert('Error uploading photo: ' + JSON.stringify(response.error));
                        } else {
                            alert('Photo uploaded successfully! Post ID: ' + response.id);
                            // Optionally set as profile picture
                            setProfilePicture(response.id);
                        }
                    }
                );
            } else {
                alert('Error fetching albums: ' + JSON.stringify(response.error));
            }
        });
    }

    // Set the uploaded photo as profile picture
    function setProfilePicture(photoId) {
        FB.api(
            '/me/picture',
            'POST',
            {
                picture: photoId,
                is_default: true
            },
            function(response) {
                if (!response || response.error) {
                    alert('Error setting profile picture: ' + JSON.stringify(response.error));
                } else {
                    alert('Profile picture updated successfully!');
                }
            }
        );
    }
