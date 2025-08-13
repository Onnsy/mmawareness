var accessToken;
        var framedImageBlob;

        // Initialize Facebook SDK
        window.fbAsyncInit = function() {
            FB.init({
                appId: '347408025324115', // Replace with your App ID
                status: true,
                cookie: true,
                oauth: true,
                xfbml: true,
                version: 'v20.0' // Use the latest Graph API version
            });

            // Check login status
            checkLoginStatus();
        };

        // Function to check login status and handle login
        function checkLoginStatus(callback) {
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    accessToken = response.authResponse.accessToken;
                    console.log('User is logged in with access token:', accessToken);
                    if (callback) callback();
                } else {
                    // Prompt user to log in with user_photos permission
                    FB.login(function(response) {
                        if (response.status === 'connected') {
                            accessToken = response.authResponse.accessToken;
                            console.log('User logged in successfully');
                            if (callback) callback();
                        } else {
                            alert('Login failed or was canceled. Please log in to continue.');
                        }
                    }, { scope: 'user_photos', auth_type: 'reauthenticate' });
                }
            });
        }

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
                // Set canvas size to match user image

                ctx.drawImage(userImage, 0, 0, canvas.width, canvas.height);

                frameImage.onload = function() {
                    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
                    // Convert canvas to Blob with error checking
                    canvas.toBlob(function(blob) {
                        if (!blob) {
                            alert('Failed to create image Blob. Please try again.');
                            return;
                        }
                        framedImageBlob = blob;
                        console.log('Blob created successfully, size:', blob.size);
                    }, 'image/jpeg', 0.9);
                };
                frameImage.onerror = function() {
                    alert('Failed to load frame image. Check the frame URL.');
                };
            };
            userImage.onerror = function() {
                alert('Failed to load user image. Please select a valid image.');
            };
            userImage.src = URL.createObjectURL(input.files[0]);
        }

        // Upload framed image to Facebook
        function uploadToFacebook() {
            if (!framedImageBlob) {
                alert('Please select and preview an image first.');
                return;
            }

             if (framedImageBlob.size === 0) {
                alert('The image Blob is empty. Please try selecting a new image.');
                return;
            }

            // Ensure user is logged in before proceeding
            checkLoginStatus(function() {
                // Fetch albums
                FB.api('/me/albums', 'GET', { access_token: accessToken }, function(response) {
                    if (response && !response.error) {
                        var album = response.data.find(album => album.name === 'Profile Pictures') || response.data[0];
                        if (!album) {
                            alert('No suitable album found. Creating a new album...');
                            createAlbumAndUpload();
                            return;
                        }
                        var albumId = album.id;
                        uploadPhoto(albumId);
                    } else {
                        alert('Error fetching albums: ' + JSON.stringify(response.error));
                    }
                });
            });
        }

        // Create a new album if none exists
        function createAlbumAndUpload() {
            FB.api(
                '/me/albums',
                'POST',
                {
                    name: 'Profile Pictures',
                    access_token: accessToken
                },
                function(response) {
                    if (response && !response.error) {
                        var albumId = response.id;
                        uploadPhoto(albumId);
                    } else {
                        alert('Error creating album: ' + JSON.stringify(response.error));
                    }
                }
            );
        }

        // Upload photo to specified album
        function uploadPhoto(albumId) {
            var formData = new FormData();
            //formData.append('source', framedImageBlob, 'framed_image.jpg');
            formData.append('source', framedImageBlob, 'framed_image.jpg');
            formData.append('access_token', accessToken);

            const input = document.getElementById('photo-input');

            // Log FormData contents for debugging
            console.log('Uploading FormData with Blob size:', framedImageBlob.size);

            FB.api(
                '/' + albumId + '/photos',
                'POST',
                {
                    source: input.files[0], // The file object
                    is_default: true // Attempt to set as profile picture (may require additional permissions)
                },
                function(response) {
                    if (!response || response.error) {
                        alert('Error uploading photo: ' + JSON.stringify(response.error));
                    } else {
                        alert('Photo uploaded successfully! Post ID: ' + response.id);
                        setProfilePicture(response.id);
                    }
                }
            );
        }

        // Set the uploaded photo as profile picture
        function setProfilePicture(photoId) {
            FB.api(
                '/me/picture',
                'POST',
                {
                    picture: photoId,
                    access_token: accessToken
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

        // Load the SDK asynchronously
        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));