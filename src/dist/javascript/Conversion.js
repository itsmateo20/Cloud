document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const conversionType = document.getElementById('conversionType');

    console.log(fileInput, conversionType);

    if (!fileInput || !conversionType) {
        console.error('Could not find fileInput or conversionType elements');
        return;
    }

    const conversionOptions = {
        video: ['gif', 'mp3', 'mp4', 'avi', 'webm', 'mov'],
        image: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'aac'],
        document: ['pdf', 'docx', 'txt', 'html']
    };

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileType = getFileType(file.type);
        updateConversionOptions(fileType);
    });

    function getFileType(mimeType) {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'document';
        return 'other';
    }

    function updateConversionOptions(fileType) {
        conversionType.innerHTML = '<option value="">Select conversion type...</option>';
        const options = conversionOptions[fileType] || [];
        const currentExtension = fileInput.files[0].name.split('.').pop().toLowerCase();

        if (options.length === 0) {
            conversionType.innerHTML = '<option value="">No conversion options available</option>';
            conversionType.disabled = true;
            return;
        } else if (!options.includes(currentExtension)) {
            conversionType.innerHTML = '<option value="">Invalid file type</option>';
            conversionType.disabled = true;
            return;
        } else if (options.length > 0) {
            conversionType.disabled = false;
        }

        options.forEach(option => {
            if (option !== currentExtension) {
                const optionElement = document.createElement('option');
                optionElement.value = `${currentExtension}-to-${option}`;
                optionElement.textContent = `Convert to ${option.toUpperCase()}`;
                conversionType.appendChild(optionElement);
            }
        });
    }

    const conversionForm = document.getElementById('conversion-form');
    const conversionMessage = document.getElementById('conversion-message');

    if (conversionForm && conversionMessage) {
        conversionForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const formData = new FormData(conversionForm);

            try {
                const response = await fetch('/convert', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    conversionMessage.textContent = result.message;
                    conversionMessage.classList.add('text-success');
                    conversionMessage.classList.remove('text-danger');
                    // You might want to add a download link here
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                conversionMessage.textContent = `Error: ${error.message}`;
                conversionMessage.classList.add('text-danger');
                conversionMessage.classList.remove('text-success');
            }
        });
    } else {
        console.error('Could not find conversionForm or conversionMessage elements');
    }
});