export default {
  "schema": "spatial-model/1",
  "name": "새 도면 예제 · 미팅 라운지",
  "scale": 1,
  "origin": [
    0,
    0
  ],
  "scaleBasis": "합성 예제 · 좌표 단위 m",
  "ceilingHeight": 3,
  "source": {
    "original": null,
    "preview": null
  },
  "footprint": [
    [
      0,
      0
    ],
    [
      16,
      0
    ],
    [
      16,
      10
    ],
    [
      0,
      10
    ]
  ],
  "voids": [],
  "regions": [
    {
      "id": "lounge-a",
      "name": "라운지 A",
      "category": "public",
      "polygon": [
        [
          0,
          0
        ],
        [
          10,
          0
        ],
        [
          10,
          10
        ],
        [
          0,
          10
        ]
      ],
      "color": "#d9c6ac"
    },
    {
      "id": "meeting-b",
      "name": "회의실 B",
      "category": "meeting",
      "polygon": [
        [
          10,
          0
        ],
        [
          16,
          0
        ],
        [
          16,
          10
        ],
        [
          10,
          10
        ]
      ],
      "color": "#c2d4df"
    }
  ],
  "objects": [
    {
      "id": "wall-0",
      "kind": "wall",
      "type": "wall",
      "regionId": "perimeter",
      "a": [
        0,
        0
      ],
      "b": [
        16,
        0
      ],
      "height": 3,
      "thickness": 0.15,
      "color": "#d6d8d5"
    },
    {
      "id": "wall-1",
      "kind": "wall",
      "type": "wall",
      "regionId": "perimeter",
      "a": [
        16,
        0
      ],
      "b": [
        16,
        10
      ],
      "height": 3,
      "thickness": 0.15,
      "color": "#d6d8d5"
    },
    {
      "id": "wall-2",
      "kind": "wall",
      "type": "wall",
      "regionId": "perimeter",
      "a": [
        16,
        10
      ],
      "b": [
        0,
        10
      ],
      "height": 3,
      "thickness": 0.15,
      "color": "#d6d8d5"
    },
    {
      "id": "wall-3",
      "kind": "wall",
      "type": "wall",
      "regionId": "perimeter",
      "a": [
        0,
        10
      ],
      "b": [
        0,
        0
      ],
      "height": 3,
      "thickness": 0.15,
      "color": "#d6d8d5"
    },
    {
      "id": "wall-4",
      "kind": "wall",
      "type": "wall",
      "regionId": "meeting-b",
      "a": [
        10,
        0
      ],
      "b": [
        10,
        4
      ],
      "height": 3,
      "thickness": 0.15,
      "color": "#d6d8d5"
    },
    {
      "id": "wall-5",
      "kind": "wall",
      "type": "wall",
      "regionId": "meeting-b",
      "a": [
        10,
        6
      ],
      "b": [
        10,
        10
      ],
      "height": 3,
      "thickness": 0.15,
      "color": "#d6d8d5"
    },
    {
      "id": "sofa-a-seat",
      "name": "라운지 소파",
      "kind": "box",
      "type": "furniture",
      "regionId": "lounge-a",
      "position": [
        3,
        3
      ],
      "size": [
        2.4,
        0.9
      ],
      "height": 0.45,
      "base": 0,
      "color": "#c3ae90",
      "furnitureId": "sofa-a"
    },
    {
      "id": "sofa-a-back",
      "name": "소파 등받이",
      "kind": "box",
      "type": "furniture",
      "regionId": "lounge-a",
      "position": [
        3,
        2.65
      ],
      "size": [
        2.4,
        0.2
      ],
      "height": 0.45,
      "base": 0.45,
      "color": "#c3ae90",
      "furnitureId": "sofa-a"
    },
    {
      "id": "table-b",
      "name": "회의 테이블",
      "kind": "box",
      "type": "furniture",
      "regionId": "meeting-b",
      "position": [
        13,
        5
      ],
      "size": [
        1.2,
        3.2
      ],
      "height": 0.12,
      "base": 0.62,
      "color": "#bea783"
    },
    {
      "id": "column-a",
      "kind": "cylinder",
      "type": "column",
      "regionId": "columns",
      "position": [
        7,
        2
      ],
      "radius": 0.25,
      "height": 3
    }
  ],
  "assumptions": [
    "실제 도면이 아닌 재사용 검증용 합성 모델입니다.",
    "층고 3m, 가구와 벽 치수는 예제 설정입니다."
  ]
};
