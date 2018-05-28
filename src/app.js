var VSHADER_SOURCE = `
#ifdef GL_ES
  precision mediump float;
  #endif
attribute float a_PointSize;
attribute vec4 a_Color;
varying vec4 v_Color;
attribute vec4 a_Normal;
varying vec3 v_Normal;
attribute vec4 a_Position;
varying vec4 v_Position;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
uniform vec3 u_DiffuseColor;
uniform vec3 u_LightPosition;
uniform vec3 u_AmbientLight;
uniform vec3 u_SpecularColor;
uniform float u_Shader;
void main() {
  //Shared changes
  gl_Position = u_MvpMatrix * a_Position;
  gl_PointSize = a_PointSize;
  v_Normal = vec3(a_Normal);
  v_Position = u_MvpMatrix * a_Position;
  
  //Goraud shading
  if(u_Shader == 0.0){
    vec3 lightPosition = vec3(u_MvpMatrix * vec4(u_LightPosition, 1));  
    vec3 lightDirection = normalize((lightPosition) - vec3(v_Position));
    float nDotL = max(dot(lightDirection, v_Normal), 0.0);
    vec3 diffuse = u_DiffuseColor * a_Color.rgb * nDotL;
    vec3 ambient = u_AmbientLight;
    v_Color = vec4(diffuse + ambient, a_Color.a);
  }else if(u_Shader == 1.0 || u_Shader == 2.0){
    v_Color = a_Color;
  }
  
}
`;

var FSHADER_SOURCE = `
    #ifdef GL_ES
    precision mediump float;
    #endif
    uniform float u_Shader;
    varying vec4 v_Color; 
    varying vec3 v_Normal;
    varying vec4 v_Position;
    uniform vec3 u_DiffuseColor;
    uniform vec3 u_LightPosition;
    uniform vec3 u_AmbientLight;
    uniform vec3 u_SpecularColor;
    uniform float u_SpecularExponent;
    uniform mat4 u_MvpMatrix;
    uniform float u_ObjectIndex;
    uniform float u_AlphaMode;
    uniform float u_ClickedIndex;
    float celColor(in float colorVal){
      if(colorVal >= 1.0 ){
        return 1.0;
      }else if (colorVal >= 0.8){
        return 0.8;
      }else if (colorVal >= 0.6){
        return 0.6;
      }else if (colorVal >= 0.4){
        return 0.4;
      }else if(colorVal >= 0.1){
        return 0.1;
      }else if(colorVal >= 0.0 || colorVal < 0.0){
        return 0.0;
      }
      return 0.0;
    }
    void main() {
      if(u_Shader == 0.0){
        //Goraud Shading
        gl_FragColor = v_Color;
      }else if(u_Shader == 1.0){
        //Phong Shading
        vec3 lightPosition = vec3(u_MvpMatrix * vec4(u_LightPosition, 1));
        vec3 lightDirection = normalize(lightPosition - vec3(v_Position));
        float nDotL = max(dot(lightDirection, v_Normal), 0.0);
        vec3 diffuse = u_DiffuseColor * v_Color.rgb * nDotL;
        vec3 ambient = u_AmbientLight;
        vec3 reflectionVector = normalize(2.0 * nDotL * v_Normal - lightDirection);
        vec3 orthoEyeVector = vec3(0.0, 0.0, -1.0);
        //vec3 specular = vec3(v_Color) * u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        vec3 specular = u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        gl_FragColor = vec4(diffuse + ambient + specular, v_Color.a);
      } else if (u_Shader == 2.0){
        //Cel Shading
        vec3 lightPosition = vec3(u_MvpMatrix * vec4(u_LightPosition, 1));
        vec3 lightDirection = normalize(lightPosition - vec3(v_Position));
        float nDotL = max(dot(lightDirection, v_Normal), 0.0);
        vec3 diffuse = u_DiffuseColor * v_Color.rgb * nDotL;
        vec3 ambient = u_AmbientLight;
        vec3 reflectionVector = normalize(2.0 * nDotL * v_Normal - lightDirection);
        vec3 orthoEyeVector = vec3(0.0, 0.0, -1.0);
        //vec3 specular = vec3(v_Color) * u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        vec3 specular = u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        vec4 resultColor = vec4(diffuse + ambient + specular, 1.0);
        resultColor.r = celColor(resultColor.r);
        resultColor.g = celColor(resultColor.g);
        resultColor.b = celColor(resultColor.b);
        gl_FragColor = resultColor;
      }
      if(u_ClickedIndex == u_ObjectIndex){
        vec3 highlight = vec3(0.15, 0.15, 0.15);
        gl_FragColor = vec4(vec3(gl_FragColor) + highlight, 1.0); 
      }
      if(u_AlphaMode == 1.0){
        gl_FragColor = vec4(vec3(gl_FragColor), u_ObjectIndex/255.0);
      }
    }
    
`;

function main(){
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }
    setClickedIndex(gl, -1);
    setLights(gl);
    setDefaultMvpMatrix(gl, canvas);
    setShader(gl, 2);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    render(gl);

}
function render(gl){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var teaPot = document.getElementById('objTeapot').innerHTML;

    let teaPotMesh = new OBJ.Mesh(teaPot);
    console.log("Teapot Mesh:");
    console.log(teaPotMesh);

    OBJ.initMeshBuffers(gl, teaPotMesh);

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');

    console.log(a_Position);
    console.log(a_Normal);
    console.log(a_Color);

    // gl.bindBuffer(gl.ARRAY_BUFFER, teaPotMesh.vertexBuffer);
    // gl.vertexAttribPointer(a_Position, teaPotMesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // gl.bindBuffer(gl.ARRAY_BUFFER, teaPotMesh.normalBuffer);
    // gl.vertexAttribPointer(a_Normal, teaPotMesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // var color = new Vector3([0.0, 1.0, 0.0]);
    // var colorBuff = makeSolidColorBuffer(color, teaPotMesh.vertexBuffer.numItems);
    // if (!initArrayBuffer(gl, new Float32Array(colorBuff), 3, gl.FLOAT, 'a_Color')){
    //     console.log('Failed to init color buffer');
    //     return -1;
    // }


    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teaPotMesh.indexBuffer);

    // gl.drawElements(gl.TRIANGLES, teaPotMesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    var color = new Vector3([1, 0, 0]);
    var colors = makeSolidColorBuffer(color, teaPotMesh.vertices.length);
    var vertices = teaPotMesh.vertices;
    var normals = teaPotMesh.vertexNormals;
    var indices = teaPotMesh.indices;
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer) 
        return -1;

    // Write the vertex coordinates and color to the buffer object
    if (!initArrayBuffer(gl, new Float32Array(vertices), 3, gl.FLOAT, 'a_Position'))
        return -1;

    if (!initArrayBuffer(gl, new Float32Array(colors), 3, gl.FLOAT, 'a_Color'))
        return -1;
    
    
    if (!initArrayBuffer(gl, new Float32Array(normals), 3, gl.FLOAT, 'a_Normal'))
        return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);


}

function initArrayBuffer(gl, data, num, type, attribute) {
    var buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
      console.log('Failed to create the buffer object');
      return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
      console.log('Failed to get the storage location of ' + attribute);
      return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);
  
    return true;
}

function makeSolidColorBuffer(color, length){
    let colorArr = color.elements;
    var colorBuff = [];
    for(let i = 0; i < length; i++){
      colorBuff.push(colorArr[0]);colorBuff.push(colorArr[1]);colorBuff.push(colorArr[2]);
    }
    return colorBuff;
  }
  function setLights(gl){
    var u_DiffuseColor = gl.getUniformLocation(gl.program, 'u_DiffuseColor');
    var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');

     // Set the light color (white)
    gl.uniform3f(u_DiffuseColor, 1.0, 1.0, 1.0);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, 0.0, 80.0, -150.0);
    // Set the ambient light
    gl.uniform3f(u_AmbientLight, 0.5, 0.0, 0.0);

    //Set specular exponent
    setSpecularColor(gl, 0.8, 0.8, 0.8);
    setSpecularExponent(gl, 20.0);
  }
  function setDiffuse(gl, r, g, b){
    var u_DiffuseColor = gl.getUniformLocation(gl.program, 'u_DiffuseColor');
    gl.uniform3f(u_DiffuseColor, r, g, b);

}
  function setLightPosition(gl, position){
    var el = position.elements;
    var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    gl.uniform3f(u_LightPosition, el[0], el[1], el[2]);
  }
  function setAmbient(gl, r, g, b){
    var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
    gl.uniform3f(u_AmbientLight, r, g, b);
  }
  function setShader(gl, shader){
    var u_Shader = gl.getUniformLocation(gl.program, 'u_Shader');
    gl.uniform1f(u_Shader, shader);
  }
  function setSpecularColor(gl, r, g, b){
    var u_SpecularColor = gl.getUniformLocation(gl.program, 'u_SpecularColor');
    gl.uniform3f(u_SpecularColor, r, g, b);
  }
  function setSpecularExponent(gl, exponent){
    var u_SpecularExponent = gl.getUniformLocation(gl.program, 'u_SpecularExponent');
    gl.uniform1f(u_SpecularExponent, exponent);
  }
  function setEyeVector(gl, eyePosition){
    var u_EyeVector = gl.getUniformLocation(gl.program, 'u_EyeVector');
    gl.uniform3f(u_EyeVector, eyePosition);
  }
  function setDefaultMvpMatrix(gl, canvas){
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    if (!u_MvpMatrix) {
      console.log('Failed to get the storage location of u_MvpMatrix');
      return;
    }
  //   // Set the eye point and the viewing volume
    var mvpMatrix = new Matrix4();
  //   mvpMatrix.setTranslate(0.5, 0, 0);
  //   var orthoMatrix = new Matrix4();
  //   orthoMatrix.setOrtho(-1, 1, -1, 1, 1, -1);
  //   mvpMatrix.multiply(orthoMatrix);
    mvpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 400);
    mvpMatrix.lookAt(0, 0, 370, 0, 0, 0, 0, 1, 0);
  
    // Pass the model view projection matrix to u_MvpMatrix
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  }
  function setMvpMatrix(gl, eyePosition, center, up, near, far, viewAngle, ratio=1){
    var mvpMatrix = new Matrix4();
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    mvpMatrix.setPerspective(viewAngle, ratio, near, far);
    var eye = eyePosition.elements;
    var point = center.elements;
    var upVec = up.elements;
    mvpMatrix.lookAt(eye[0], eye[1], eye[2], point[0], point[1], point[2], upVec[0], upVec[1], upVec[2]);
    // Pass the model view projection matrix to u_MvpMatrix
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  }
  function setObjectIndex(gl, index){
    //Get uniform location
    var u_ObjectIndex = gl.getUniformLocation(gl.program, 'u_ObjectIndex');
    //Set uniform value to index
    gl.uniform1f(u_ObjectIndex, index);
  }
  function setAlphaMode(gl, alpha){
    // console.log('Changing alpha mode to ' + alpha);
    //Get uniform location
    var u_AlphaMode = gl.getUniformLocation(gl.program, 'u_AlphaMode');
    //Set uniform calue
    gl.uniform1f(u_AlphaMode, alpha);
  }
  function setClickedIndex(gl, index){
    var u_ClickedIndex = gl.getUniformLocation(gl.program, 'u_ClickedIndex');
    gl.uniform1f(u_ClickedIndex, index);
  }