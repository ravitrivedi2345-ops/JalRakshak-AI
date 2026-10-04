from typing import Dict, Any

def calculate_evidence_score(
    gps_quality: float = 95.0,
    temporal_alignment: float = 65.0,
    satellite_suitability: float = 88.0,
    image_quality: float = 74.0
) -> Dict[str, Any]:
    # Formula: Score = 0.30*G + 0.25*T + 0.25*S + 0.20*I
    score = round(
        0.30 * gps_quality +
        0.25 * temporal_alignment +
        0.25 * satellite_suitability +
        0.20 * image_quality
    )

    explanation = (
        f"Calculated from transparent contributors: 30% GPS quality ({gps_quality}%), "
        f"25% temporal alignment ({temporal_alignment}%), "
        f"25% satellite suitability ({satellite_suitability}%), and "
        f"20% image match ({image_quality}%). "
        "This score evaluates evidence completeness; it does not claim verified environmental impact."
    )

    return {
        "overall_score": score,
        "breakdown": {
            "gps_quality": gps_quality,
            "temporal_alignment": temporal_alignment,
            "satellite_suitability": satellite_suitability,
            "image_analysis_quality": image_quality
        },
        "explanation": explanation
    }
